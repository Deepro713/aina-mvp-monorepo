import { generateObject, generateText } from "ai";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import * as analyzeRoute from "@/app/api/analyze/route";
import { CATEGORIES, feedbackEntries, SENTIMENTS } from "@/lib/db/schema";
import { getTestDb } from "./helpers/db";
import { seedConnection, signedInUser, VALID_OUTPUT } from "./helpers/fixtures";
import { call } from "./helpers/http";

const analyze = (raw_text: string) => call(analyzeRoute.POST, { method: "POST", body: { raw_text } });
const rowsFor = (userId: string) => getTestDb().select().from(feedbackEntries).where(eq(feedbackEntries.userId, userId));
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
const GARBAGE = { object: { sentiment: "furious", category: "complaints", summary: "" } };

describe("P0.3 analyze one entry", () => {
  it("returns 201 with enum labels, a ≤25-word summary, and saves a provider/model snapshot", async () => {
    const user = await signedInUser();
    await seedConnection(user.id, { provider: "openai", modelId: "gpt-4o-mini" });
    vi.mocked(generateObject).mockResolvedValue({ object: VALID_OUTPUT } as never);

    const r = await analyze("Checkout keeps charging me twice.");
    expect(r.status).toBe(201);
    expect(SENTIMENTS).toContain(r.json.sentiment);
    expect(CATEGORIES).toContain(r.json.category);
    expect(wordCount(r.json.summary)).toBeLessThanOrEqual(25);
    expect(r.json).toMatchObject({ provider: "openai", model_id: "gpt-4o-mini", raw_text: "Checkout keeps charging me twice." });

    const rows = await rowsFor(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: r.json.id, sentiment: "negative", category: "pricing_billing", modelId: "gpt-4o-mini" });
  });

  it("normalises label variants (e.g. 'Feature Request' → feature_request) and truncates long summaries", async () => {
    const user = await signedInUser();
    await seedConnection(user.id);
    const longSummary = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
    vi.mocked(generateObject).mockResolvedValue({
      object: { Sentiment: "Mixed", category: "Feature Request", summary: longSummary },
    } as never);

    const r = await analyze("Love it but please add dark mode");
    expect(r.status).toBe(201);
    expect(r.json).toMatchObject({ sentiment: "mixed", category: "feature_request" });
    expect(wordCount(r.json.summary)).toBeLessThanOrEqual(25);
  });

  it("parses prompt-level JSON from OpenAI-compatible models (think blocks, code fences, aliases)", async () => {
    const user = await signedInUser();
    await seedConnection(user.id, { provider: "openai_compatible", modelId: "llama3.1", baseUrl: "https://8.8.8.8/v1", apiKey: null });
    vi.mocked(generateText).mockResolvedValue({
      text: '<think>hmm</think>Sure!\n```json\n{"sentiment":"POS","category":"bug report","summary":"Customer reports a crash on launch."}\n```',
    } as never);

    const r = await analyze("App crashes on launch but support was lovely");
    expect(r.status).toBe(201);
    expect(r.json).toMatchObject({ sentiment: "positive", category: "bug", provider: "openai_compatible" });
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("retries once on invalid output and saves the valid second answer", async () => {
    const user = await signedInUser();
    await seedConnection(user.id);
    vi.mocked(generateObject)
      .mockResolvedValueOnce(GARBAGE as never)
      .mockResolvedValueOnce({ object: VALID_OUTPUT } as never);

    const r = await analyze("Charged twice");
    expect(r.status).toBe(201);
    expect(generateObject).toHaveBeenCalledTimes(2);
    expect(String(vi.mocked(generateObject).mock.calls[1][0].prompt)).toMatch(/could not be parsed/);
    expect(await rowsFor(user.id)).toHaveLength(1);
  });

  it("returns 502 model_invalid_output (retryable) after 1 failed retry and writes no row", async () => {
    const user = await signedInUser();
    await seedConnection(user.id);
    vi.mocked(generateObject).mockResolvedValue(GARBAGE as never);

    const r = await analyze("Charged twice");
    expect(r.status).toBe(502);
    expect(r.json.error).toMatchObject({ code: "model_invalid_output", retryable: true });
    expect(generateObject).toHaveBeenCalledTimes(2);
    expect(await rowsFor(user.id)).toHaveLength(0);
  });

  it("returns 413 for text over 10,000 characters", async () => {
    const user = await signedInUser();
    await seedConnection(user.id);
    const r = await analyze("x".repeat(10_001));
    expect(r.status).toBe(413);
    expect(r.json.error.code).toBe("text_too_long");
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("returns 422 for empty text", async () => {
    const user = await signedInUser();
    await seedConnection(user.id);
    const r = await analyze("   ");
    expect(r.status).toBe(422);
    expect(r.json.error.fields.raw_text).toBeTruthy();
  });

  it("returns 409 no_connection when the user hasn't connected a model", async () => {
    await signedInUser();
    const r = await analyze("hello");
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe("no_connection");
  });

  it("returns 429 daily_limit_reached on the 501st analysis in 24 h", async () => {
    const user = await signedInUser();
    await seedConnection(user.id);
    const now = new Date();
    await getTestDb().insert(feedbackEntries).values(Array.from({ length: 500 }, (_, i) => ({
      userId: user.id, rawText: `e${i}`, sentiment: "neutral" as const, category: "other" as const,
      summary: "Customer comment.", provider: "openai" as const, modelId: "gpt-4o-mini", createdAt: now, updatedAt: now,
    })));
    const r = await analyze("one more");
    expect(r.status).toBe(429);
    expect(r.json.error.code).toBe("daily_limit_reached");
    expect(generateObject).not.toHaveBeenCalled();
  });
});

describe("P0.4 batch paste: server side (entries are independent)", () => {
  it("one failing entry in a concurrent batch does not block the others", async () => {
    const user = await signedInUser();
    await seedConnection(user.id);
    vi.mocked(generateObject).mockImplementation((async (opts: { prompt: string }) =>
      opts.prompt.includes("BROKEN") ? GARBAGE : { object: VALID_OUTPUT }) as never);

    const results = await Promise.all(["Great app", "BROKEN entry", "Billing is wrong"].map(analyze));
    expect(results.map((r) => r.status)).toEqual([201, 502, 201]);
    expect(results[1].json.error.retryable).toBe(true);
    expect(await rowsFor(user.id)).toHaveLength(2);
  });
});
