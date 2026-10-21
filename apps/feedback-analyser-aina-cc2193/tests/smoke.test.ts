import { generateObject, generateText } from "ai";
import { describe, expect, it, vi } from "vitest";
import * as analyzeRoute from "@/app/api/analyze/route";
import * as connectionRoute from "@/app/api/connection/route";
import * as testRoute from "@/app/api/connection/test/route";
import * as entryRoute from "@/app/api/entries/[id]/route";
import * as entriesRoute from "@/app/api/entries/route";
import * as statsRoute from "@/app/api/stats/route";
import { signedInUser } from "./helpers/fixtures";
import { call } from "./helpers/http";

const LABELS: Record<string, { sentiment: string; category: string; summary: string }> = {
  charged: { sentiment: "negative", category: "pricing_billing", summary: "Customer was double-charged at checkout." },
  faster: { sentiment: "positive", category: "praise", summary: "Customer praises the faster dashboard." },
  export: { sentiment: "negative", category: "bug", summary: "Customer reports CSV export failing." },
};

describe("smoke: sign in → connect → analyze → dashboard → correct → delete", () => {
  it("runs the full golden path", async () => {
    // 1. Signed-in user with no connection yet
    await signedInUser("pm@example.com");
    expect((await call(connectionRoute.GET)).json.connection).toBeNull();

    // 2. Test the connection, then save it with the test token
    vi.mocked(generateText).mockResolvedValue({ text: "OK" } as never);
    const creds = { provider: "openai", model_id: "gpt-4o-mini", api_key: "sk-live-smoke-test-key-4321" };
    const tested = await call(testRoute.POST, { method: "POST", body: creds });
    expect(tested.status).toBe(200);
    const saved = await call(connectionRoute.PUT, { method: "PUT", body: { ...creds, test_token: tested.json.test_token } });
    expect(saved.json).toMatchObject({ key_last4: "4321" });
    expect(saved.json.last_tested_at).not.toBeNull();

    // 3. Analyze a 3-line batch (each line is its own request, run concurrently like the browser does)
    vi.mocked(generateObject).mockImplementation((async (opts: { prompt: string }) => {
      const key = Object.keys(LABELS).find((k) => opts.prompt.includes(k))!;
      return { object: LABELS[key] };
    }) as never);
    const lines = ["Checkout charged my card twice", "The new dashboard is so much faster", "CSV export fails over 90 days"];
    const results = await Promise.all(lines.map((raw_text) => call(analyzeRoute.POST, { method: "POST", body: { raw_text } })));
    expect(results.map((r) => r.status)).toEqual([201, 201, 201]);

    // 4. Dashboard shows the breakdown
    let stats = (await call(statsRoute.GET, { path: "/api/stats?range=7d" })).json;
    expect(stats.total).toBe(3);
    expect(stats.sentiment).toMatchObject({ negative: 2, positive: 1 });
    expect(stats.category).toMatchObject({ pricing_billing: 1, praise: 1, bug: 1 });

    // 5. Correct a wrong label; the breakdown follows
    const billing = results.find((r) => r.json.category === "pricing_billing")!.json;
    const patched = await call(entryRoute.PATCH, { method: "PATCH", params: { id: billing.id }, body: { sentiment: "mixed" } });
    expect(patched.status).toBe(200);
    stats = (await call(statsRoute.GET, { path: "/api/stats" })).json;
    expect(stats.sentiment).toMatchObject({ negative: 1, positive: 1, mixed: 1 });

    // 6. Latest entries list reflects the correction
    const list = (await call(entriesRoute.GET, { path: "/api/entries" })).json.entries;
    expect(list).toHaveLength(3);
    expect(list.find((e: { id: string }) => e.id === billing.id).sentiment).toBe("mixed");

    // 7. Delete one entry; totals drop
    expect((await call(entryRoute.DELETE, { method: "DELETE", params: { id: billing.id } })).status).toBe(204);
    expect((await call(statsRoute.GET, { path: "/api/stats" })).json.total).toBe(2);
  });
});
