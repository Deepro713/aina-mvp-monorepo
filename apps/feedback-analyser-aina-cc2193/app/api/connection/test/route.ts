import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiRoute, parseInput, readJson, requireUserId } from "@/lib/api/http";
import { getConnectionRow, resolveInput, resolveSaved } from "@/lib/connection";
import { connectionFingerprint, issueTestToken } from "@/lib/crypto/keys";
import { getDb } from "@/lib/db/client";
import { modelConnections } from "@/lib/db/schema";
import { config } from "@/lib/env";
import { pingModel } from "@/lib/llm/classify";
import { connectionTestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 30;

export const POST = apiRoute("connection.test", async (ctx) => {
  const userId = await requireUserId(ctx);
  const input = parseInput(connectionTestSchema, await readJson(ctx.req));
  const saved = await getConnectionRow(userId);
  const { conn } = await resolveInput(userId, input, saved);
  ctx.log.provider = conn.provider;

  const latency_ms = await pingModel(conn, config.testTimeoutMs);
  ctx.log.llm_latency_ms = latency_ms;

  const fp = connectionFingerprint(conn);
  // Stamp the activation metric only when the tested credentials ARE the saved ones.
  if (saved && connectionFingerprint(resolveSaved(saved, userId)) === fp) {
    await getDb().update(modelConnections)
      .set({ lastTestedAt: new Date() })
      .where(eq(modelConnections.userId, userId));
  }
  return NextResponse.json({ ok: true, latency_ms, model_id: conn.modelId, test_token: issueTestToken(userId, fp) });
}, { mutating: true });
