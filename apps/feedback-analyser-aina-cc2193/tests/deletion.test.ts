import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as accountRoute from "@/app/api/account/route";
import * as entryRoute from "@/app/api/entries/[id]/route";
import { feedbackEntries, labelCorrections, modelConnections, users } from "@/lib/db/schema";
import { getTestDb } from "./helpers/db";
import { createUser, seedConnection, seedEntry, signedInUser } from "./helpers/fixtures";
import { call } from "./helpers/http";

const del = (id: string) => call(entryRoute.DELETE, { method: "DELETE", params: { id } });

describe("P0.7 delete entry", () => {
  it("deletes the entry but keeps its corrections with entry_id = null", async () => {
    const user = await signedInUser();
    const entry = await seedEntry(user.id, { sentiment: "negative" });
    await call(entryRoute.PATCH, { method: "PATCH", params: { id: entry.id }, body: { sentiment: "mixed" } });

    expect((await del(entry.id)).status).toBe(204);
    const db = getTestDb();
    expect(await db.select().from(feedbackEntries).where(eq(feedbackEntries.id, entry.id))).toHaveLength(0);
    const corr = await db.select().from(labelCorrections);
    expect(corr).toHaveLength(1);
    expect(corr[0]).toMatchObject({ entryId: null, field: "sentiment", oldValue: "negative", newValue: "mixed" });
  });

  it("returns 404 for another user's entry and does not delete it", async () => {
    const owner = await createUser();
    const entry = await seedEntry(owner.id);
    await signedInUser();
    expect((await del(entry.id)).status).toBe(404);
    expect(await getTestDb().select().from(feedbackEntries).where(eq(feedbackEntries.id, entry.id))).toHaveLength(1);
  });

  it("returns 404 for an unknown id", async () => {
    await signedInUser();
    expect((await del(randomUUID())).status).toBe(404);
  });
});

describe("P0.7 delete workspace", () => {
  async function seedFullAccount(email: string) {
    const user = await createUser(email);
    await seedConnection(user.id);
    const entry = await seedEntry(user.id);
    await getTestDb().insert(labelCorrections).values({ userId: user.id, entryId: entry.id, field: "sentiment", oldValue: "negative", newValue: "mixed" });
    return user;
  }

  it("requires the confirmation word", async () => {
    const user = await seedFullAccount("me@example.com");
    const { setSession } = await import("./helpers/session");
    setSession(user);
    const r = await call(accountRoute.DELETE, { method: "DELETE", body: { confirm: "nope" } });
    expect(r.status).toBe(422);
    expect(r.json.error.code).toBe("confirmation_mismatch");
    expect(await getTestDb().select().from(users).where(eq(users.id, user.id))).toHaveLength(1);
  });

  it("removes every row for the workspace and clears the cookie; other workspaces untouched", async () => {
    const other = await seedFullAccount("other@example.com");
    const user = await seedFullAccount("me@example.com");
    const { setSession } = await import("./helpers/session");
    setSession(user);

    const r = await call(accountRoute.DELETE, { method: "DELETE", body: { confirm: "DELETE" } });
    expect(r.status).toBe(204);
    const cookie = r.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("fa_workspace=");
    expect(cookie).toMatch(/Max-Age=0/i);

    const db = getTestDb();
    expect(await db.select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
    expect(await db.select().from(modelConnections).where(eq(modelConnections.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(feedbackEntries).where(eq(feedbackEntries.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(labelCorrections).where(eq(labelCorrections.userId, user.id))).toHaveLength(0);

    expect(await db.select().from(feedbackEntries).where(eq(feedbackEntries.userId, other.id))).toHaveLength(1);
  });
});
