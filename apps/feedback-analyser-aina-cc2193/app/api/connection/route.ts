import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiRoute, parseInput, readJson, requireUserId } from "@/lib/api/http";
import { getConnectionRow, resolveInput, toConnectionDto } from "@/lib/connection";
import { connectionFingerprint, encryptApiKey, lastFour, verifyTestToken } from "@/lib/crypto/keys";
import { getDb } from "@/lib/db/client";
import { modelConnections } from "@/lib/db/schema";
import { connectionPutSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = apiRoute("connection.get", async (ctx) => {
  const userId = await requireUserId(ctx);
  const row = await getConnectionRow(userId);
  return NextResponse.json({ connection: row ? toConnectionDto(row) : null });
});

export const PUT = apiRoute("connection.put", async (ctx) => {
  const userId = await requireUserId(ctx);
  const input = parseInput(connectionPutSchema, await readJson(ctx.req));
  const saved = await getConnectionRow(userId);
  const { conn, reusedSavedKey } = await resolveInput(userId, input, saved);
  ctx.log.provider = conn.provider;

  // Keep the existing ciphertext when the key is reused; otherwise encrypt the new one.
  let apiKeyEncrypted: string | null = null;
  let keyVersion = 1;
  let keyLast4: string | null = null;
  if (reusedSavedKey && saved) {
    ({ apiKeyEncrypted, keyVersion, keyLast4 } = saved);
  } else if (conn.apiKey) {
    const enc = encryptApiKey(conn.apiKey, userId);
    apiKeyEncrypted = enc.ciphertext;
    keyVersion = enc.version;
    keyLast4 = lastFour(conn.apiKey);
  }

  const fp = connectionFingerprint(conn);
  const tested = input.test_token ? verifyTestToken(input.test_token, userId, fp) : false;
  const unchanged = Boolean(saved && reusedSavedKey && saved.modelId === conn.modelId && saved.baseUrl === conn.baseUrl);
  const now = new Date();
  const values = {
    provider: conn.provider,
    modelId: conn.modelId,
    baseUrl: conn.baseUrl,
    apiKeyEncrypted,
    keyVersion,
    keyLast4,
    lastTestedAt: tested ? now : unchanged ? saved!.lastTestedAt : null,
    updatedAt: now,
  };
  const [row] = await getDb()
    .insert(modelConnections)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: modelConnections.userId, set: values })
    .returning();
  return NextResponse.json(toConnectionDto(row));
}, { mutating: true });

export const DELETE = apiRoute("connection.delete", async (ctx) => {
  const userId = await requireUserId(ctx);
  await getDb().delete(modelConnections).where(eq(modelConnections.userId, userId));
  return new NextResponse(null, { status: 204 });
}, { mutating: true });
