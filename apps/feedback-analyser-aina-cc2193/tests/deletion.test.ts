import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as accountRoute from "@/app/api/account/route";
import * as entryRoute from "@/app/api/entries/[id]/route";
import {
  feedbackEntries, labelCorrections, magicLinkAttempts, modelConnections, sessions, users, verificationTokens,
} from "@/lib/db/schema";
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

describe("P0.7 delete account", () => {
  async function seedFullAccount(email: string) {
    const db = getTestDb();
    const user = await createUser(email);
    await seedConnection(user.id);
    const entry = await seedEntry(user.id);
    await db.insert(labelCorrections).values({ userId: user.id, entryId: entry.id, field: "sentiment", oldValue: "negative", newValue: "mixed" });
    await db.insert(sessions).values({ sessionToken: `tok-${user.id}`, userId: user.id, expires: new Date(Date.now() + 86_400_000) });
    await db.insert(magicLinkAttempts).values({ email, windowStart: new Date(), count: 2 });
    await db.insert(verificationTokens).values({ identifier: email, token: `hash-${user.id}`, expires: new Date(Date.now() + 600_000) });
    return user;
  }

  it("requires the typed email to match", async () => {
    const user = await seedFullAccount("me@example.com");
    const { setSession } = await import("./helpers/session");
    setSession(user);
    const r = await call(accountRoute.DELETE, { method: "DELETE", body: { confirm_email: "other@example.com" } });
    expect(r.status).toBe(422);
    expect(r.json.error.code).toBe("confirmation_mismatch");
    expect(await getTestDb().select().from(users).where(eq(users.id, user.id))).toHaveLength(1);
  });

  it("removes every row for the user, invalidates the session and clears the cookie; other users untouched", async () => {
    const other = await seedFullAccount("other@example.com");
    const user = await seedFullAccount("me@example.com");
    const { setSession } = await import("./helpers/session");
    setSession(user);

    const r = await call(accountRoute.DELETE, { method: "DELETE", body: { confirm_email: "ME@example.com" } });
    expect(r.status).toBe(204);
    const cookie = r.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("authjs.session-token=");
    expect(cookie).toMatch(/Max-Age=0/i);

    const db = getTestDb();
    expect(await db.select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
    expect(await db.select().from(sessions).where(eq(sessions.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(modelConnections).where(eq(modelConnections.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(feedbackEntries).where(eq(feedbackEntries.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(labelCorrections).where(eq(labelCorrections.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(magicLinkAttempts).where(eq(magicLinkAttempts.email, "me@example.com"))).toHaveLength(0);
    expect(await db.select().from(verificationTokens).where(eq(verificationTokens.identifier, "me@example.com"))).toHaveLength(0);

    expect(await db.select().from(feedbackEntries).where(eq(feedbackEntries.userId, other.id))).toHaveLength(1);
    expect(await db.select().from(sessions).where(eq(sessions.userId, other.id))).toHaveLength(1);
  });
});
