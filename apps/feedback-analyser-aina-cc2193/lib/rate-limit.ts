import { and, count, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { feedbackEntries } from "@/lib/db/schema";

/** Rolling 24 h count of saved analyses; served by the (user_id, created_at) index. */
export async function analyzeCallsLast24h(userId: string): Promise<number> {
  const since = new Date(Date.now() - 86_400_000);
  const [row] = await getDb()
    .select({ n: count() })
    .from(feedbackEntries)
    .where(and(eq(feedbackEntries.userId, userId), gte(feedbackEntries.createdAt, since)));
  return row?.n ?? 0;
}
