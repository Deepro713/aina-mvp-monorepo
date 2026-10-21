import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as entryRoute from "@/app/api/entries/[id]/route";
import { feedbackEntries, labelCorrections } from "@/lib/db/schema";
import { getTestDb } from "./helpers/db";
import { createUser, seedEntry, signedInUser } from "./helpers/fixtures";
import { call } from "./helpers/http";

const patch = (id: string, body: unknown) => call(entryRoute.PATCH, { method: "PATCH", params: { id }, body });
const corrections = () => getTestDb().select().from(labelCorrections);

describe("P0.6 correct labels", () => {
  it("changing both fields writes 2 correction rows with the right old/new values", async () => {
    const user = await signedInUser();
    const entry = await seedEntry(user.id, { sentiment: "negative", category: "pricing_billing" });

    const r = await patch(entry.id, { sentiment: "mixed", category: "bug" });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ id: entry.id, sentiment: "mixed", category: "bug" });

    const rows = await corrections();
    expect(rows).toHaveLength(2);
    expect(rows.map(({ field, oldValue, newValue, entryId, userId }) => ({ field, oldValue, newValue, entryId, userId })))
      .toEqual(expect.arrayContaining([
        { field: "sentiment", oldValue: "negative", newValue: "mixed", entryId: entry.id, userId: user.id },
        { field: "category", oldValue: "pricing_billing", newValue: "bug", entryId: entry.id, userId: user.id },
      ]));

    const [saved] = await getTestDb().select().from(feedbackEntries).where(eq(feedbackEntries.id, entry.id));
    expect(saved).toMatchObject({ sentiment: "mixed", category: "bug" });
  });

  it("a PATCH that changes nothing writes 0 corrections", async () => {
    const user = await signedInUser();
    const entry = await seedEntry(user.id, { sentiment: "negative", category: "bug" });
    const r = await patch(entry.id, { sentiment: "negative", category: "bug" });
    expect(r.status).toBe(200);
    expect(await corrections()).toHaveLength(0);
  });

  it.each([
    [{ sentiment: "furious" }],
    [{ category: "complaints" }],
    [{}],
    [{ sentiment: "mixed", summary: "rewritten" }],
  ])("rejects %j with 422 and logs nothing", async (body) => {
    const user = await signedInUser();
    const entry = await seedEntry(user.id);
    const r = await patch(entry.id, body);
    expect(r.status).toBe(422);
    expect(r.json.error.code).toBe("validation_failed");
    expect(await corrections()).toHaveLength(0);
  });

  it("returns 404 for another user's entry and leaves it untouched", async () => {
    const owner = await createUser();
    const entry = await seedEntry(owner.id, { sentiment: "negative" });
    await signedInUser();

    const r = await patch(entry.id, { sentiment: "positive" });
    expect(r.status).toBe(404);
    const [row] = await getTestDb().select().from(feedbackEntries).where(eq(feedbackEntries.id, entry.id));
    expect(row.sentiment).toBe("negative");
    expect(await corrections()).toHaveLength(0);
  });

  it("returns 404 for a malformed id", async () => {
    await signedInUser();
    expect((await patch("not-a-uuid", { sentiment: "mixed" })).status).toBe(404);
  });
});
