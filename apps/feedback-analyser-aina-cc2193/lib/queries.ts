import { and, count, desc, eq, gte, lt, or } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db/client";
import { CATEGORIES, feedbackEntries as fe, SENTIMENTS, type Category, type FeedbackEntry, type Sentiment } from "@/lib/db/schema";
import type { Range } from "@/lib/validation";

const DAY = 86_400_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);

export function rangeStart(range: Range): Date | null {
  if (range === "7d") return new Date(Date.now() - 7 * DAY);
  if (range === "30d") return new Date(Date.now() - 30 * DAY);
  return null;
}

export type EntryDto = ReturnType<typeof toEntryDto>;
export function toEntryDto(e: FeedbackEntry) {
  return {
    id: e.id,
    raw_text: e.rawText,
    sentiment: e.sentiment,
    category: e.category,
    summary: e.summary,
    provider: e.provider,
    model_id: e.modelId,
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
  };
}

export type Stats = {
  range: Range; total: number;
  sentiment: Record<Sentiment, number>; category: Record<Category, number>;
};

export async function getStats(userId: string, range: Range): Promise<Stats> {
  const db = getDb();
  const since = rangeStart(range);
  const where = and(eq(fe.userId, userId), since ? gte(fe.createdAt, since) : undefined);
  const [bySentiment, byCategory] = await Promise.all([
    db.select({ key: fe.sentiment, n: count() }).from(fe).where(where).groupBy(fe.sentiment),
    db.select({ key: fe.category, n: count() }).from(fe).where(where).groupBy(fe.category),
  ]);
  const sentiment = Object.fromEntries(SENTIMENTS.map((s) => [s, 0])) as Record<Sentiment, number>;
  const category = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const r of bySentiment) sentiment[r.key] = r.n;
  for (const r of byCategory) category[r.key] = r.n;
  const total = Object.values(sentiment).reduce((a, b) => a + b, 0);
  return { range, total, sentiment, category };
}

const encodeCursor = (e: FeedbackEntry) =>
  Buffer.from(JSON.stringify([e.createdAt.toISOString(), e.id])).toString("base64url");

function decodeCursor(cursor: string): { ts: Date; id: string } {
  try {
    const [iso, id] = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const ts = new Date(iso);
    if (Number.isNaN(ts.getTime()) || typeof id !== "string" || !isUuid(id)) throw new Error();
    return { ts, id };
  } catch {
    throw new ApiError(422, "invalid_cursor", "Invalid pagination cursor.", { fields: { cursor: "Invalid" } });
  }
}

export async function listEntries(
  userId: string, opts: { range: Range; limit: number; cursor?: string },
): Promise<{ entries: EntryDto[]; next_cursor: string | null }> {
  const since = rangeStart(opts.range);
  const c = opts.cursor ? decodeCursor(opts.cursor) : null;
  const rows = await getDb()
    .select()
    .from(fe)
    .where(and(
      eq(fe.userId, userId),
      since ? gte(fe.createdAt, since) : undefined,
      c ? or(lt(fe.createdAt, c.ts), and(eq(fe.createdAt, c.ts), lt(fe.id, c.id))) : undefined,
    ))
    .orderBy(desc(fe.createdAt), desc(fe.id))
    .limit(opts.limit + 1);
  const page = rows.slice(0, opts.limit);
  return {
    entries: page.map(toEntryDto),
    next_cursor: rows.length > opts.limit ? encodeCursor(page[page.length - 1]) : null,
  };
}

export async function getEntry(userId: string, id: string): Promise<FeedbackEntry | null> {
  if (!isUuid(id)) return null;
  const [row] = await getDb().select().from(fe).where(and(eq(fe.id, id), eq(fe.userId, userId))).limit(1);
  return row ?? null;
}

/** Single loader for the /dashboard RSC (same data as /api/stats + /api/entries). */
export async function getDashboardData(userId: string, range: Range) {
  const [stats, latest] = await Promise.all([getStats(userId, range), listEntries(userId, { range, limit: 20 })]);
  return { stats, ...latest };
}
