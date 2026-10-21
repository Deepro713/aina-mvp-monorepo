import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { apiRoute, parseInput, readJson, requireUserId } from "@/lib/api/http";
import { getConnectionRow, resolveSaved } from "@/lib/connection";
import { getDb } from "@/lib/db/client";
import { feedbackEntries } from "@/lib/db/schema";
import { config } from "@/lib/env";
import { classifyFeedback } from "@/lib/llm/classify";
import { toEntryDto } from "@/lib/queries";
import { analyzeCallsLast24h } from "@/lib/rate-limit";
import { analyzeSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = apiRoute("analyze", async (ctx) => {
  const deadline = Date.now() + config.analyzeDeadlineMs;
  const userId = await requireUserId(ctx);

  const body = await readJson(ctx.req);
  const candidate = (body as { raw_text?: unknown })?.raw_text;
  if (typeof candidate === "string" && candidate.trim().length > config.rawTextMax) {
    throw new ApiError(413, "text_too_long",
      `Feedback is limited to ${config.rawTextMax.toLocaleString("en-US")} characters per entry.`,
      { fields: { raw_text: "Too long" } });
  }
  const { raw_text } = parseInput(analyzeSchema, body);

  const row = await getConnectionRow(userId);
  if (!row) throw new ApiError(409, "no_connection", "Connect a model before analyzing feedback.");

  if ((await analyzeCallsLast24h(userId)) >= config.analyzeDailyLimit) {
    throw new ApiError(429, "daily_limit_reached",
      `You've reached ${config.analyzeDailyLimit} analyses in 24 hours. Try again later.`,
      { retryable: false, retryAfterSeconds: 3600 });
  }

  const conn = resolveSaved(row, userId);
  ctx.log.provider = conn.provider;
  ctx.log.model_id = conn.modelId;

  const result = await classifyFeedback(conn, raw_text, deadline);

  const now = new Date();
  const [entry] = await getDb()
    .insert(feedbackEntries)
    .values({
      userId,
      rawText: raw_text,
      sentiment: result.sentiment,
      category: result.category,
      summary: result.summary,
      provider: conn.provider,
      modelId: conn.modelId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return NextResponse.json(toEntryDto(entry), { status: 201 });
}, { mutating: true });
