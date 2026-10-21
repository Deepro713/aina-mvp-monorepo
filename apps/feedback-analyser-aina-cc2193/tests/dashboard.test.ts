import { describe, expect, it } from "vitest";
import * as entriesRoute from "@/app/api/entries/route";
import * as statsRoute from "@/app/api/stats/route";
import { CATEGORIES, SENTIMENTS } from "@/lib/db/schema";
import { setSession } from "./helpers/session";
import { createUser, seedEntry } from "./helpers/fixtures";
import { call } from "./helpers/http";

const stats = (range?: string) => call(statsRoute.GET, { path: `/api/stats${range ? `?range=${range}` : ""}` });
const entries = (qs = "") => call(entriesRoute.GET, { path: `/api/entries${qs}` });
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

async function seedTwoUsers() {
  const a = await createUser("a@example.com");
  const b = await createUser("b@example.com");
  const aEntries = [
    await seedEntry(a.id, { daysAgo: 40, sentiment: "mixed", category: "other" }),
    await seedEntry(a.id, { daysAgo: 10, sentiment: "positive", category: "praise" }),
    await seedEntry(a.id, { daysAgo: 2, sentiment: "negative", category: "bug" }),
    await seedEntry(a.id, { daysAgo: 1, sentiment: "negative", category: "pricing_billing" }),
  ];
  const bEntry = await seedEntry(b.id, { daysAgo: 1, sentiment: "positive", category: "support" });
  setSession(a);
  return { a, b, aEntries, bEntry };
}

describe("P0.5 dashboard: /api/stats", () => {
  it("counts only the caller's entries inside the range, zero-filled, summing to total", async () => {
    await seedTwoUsers();

    const d30 = await stats("30d");
    expect(d30.status).toBe(200);
    expect(d30.json.total).toBe(3);
    expect(Object.keys(d30.json.sentiment).sort()).toEqual([...SENTIMENTS].sort());
    expect(Object.keys(d30.json.category).sort()).toEqual([...CATEGORIES].sort());
    expect(d30.json.sentiment).toMatchObject({ negative: 2, positive: 1, mixed: 0, neutral: 0 });
    expect(d30.json.category).toMatchObject({ bug: 1, pricing_billing: 1, praise: 1, support: 0, other: 0 });
    expect(sum(d30.json.sentiment)).toBe(d30.json.total);
    expect(sum(d30.json.category)).toBe(d30.json.total);

    expect((await stats("7d")).json.total).toBe(2);
    expect((await stats("all")).json.total).toBe(4);
    expect((await stats()).json.range).toBe("all");
  });

  it("rejects an unknown range with 422", async () => {
    await seedTwoUsers();
    expect((await stats("90d")).status).toBe(422);
  });
});

describe("P0.5 dashboard: /api/entries", () => {
  it("returns entries newest first and pages with limit + cursor without gaps or duplicates", async () => {
    const { aEntries } = await seedTwoUsers();
    const expected = [...aEntries].reverse().map((e) => e.id);

    const p1 = await entries("?limit=2");
    expect(p1.json.entries.map((e: { id: string }) => e.id)).toEqual(expected.slice(0, 2));
    expect(p1.json.next_cursor).toBeTruthy();

    const p2 = await entries(`?limit=2&cursor=${encodeURIComponent(p1.json.next_cursor)}`);
    expect(p2.json.entries.map((e: { id: string }) => e.id)).toEqual(expected.slice(2, 4));
    expect(p2.json.next_cursor).toBeNull();
  });

  it("applies the range filter", async () => {
    await seedTwoUsers();
    expect((await entries("?range=7d")).json.entries).toHaveLength(2);
  });

  it("never shows another user's entries", async () => {
    const { bEntry } = await seedTwoUsers();
    const ids = (await entries("?limit=100")).json.entries.map((e: { id: string }) => e.id);
    expect(ids).not.toContain(bEntry.id);
    expect(ids).toHaveLength(4);
  });

  it("rejects a tampered cursor with 422", async () => {
    await seedTwoUsers();
    const r = await entries("?cursor=not-a-real-cursor");
    expect(r.status).toBe(422);
    expect(r.json.error.code).toBe("invalid_cursor");
  });
});
