import { and, count, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { feedbackEntries, magicLinkAttempts } from "@/lib/db/schema";
import { config } from "@/lib/env";

const normEmail = (e: string) => e.trim().toLowerCase();

function hourWindow(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export const secondsUntilNextWindow = () => Math.ceil((hourWindow().getTime() + 3_600_000 - Date.now()) / 1000);

/** Read-only check, used to return a clean 429 before Auth.js runs. */
export async function canSendMagicLink(email: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ count: magicLinkAttempts.count })
    .from(magicLinkAttempts)
    .where(and(eq(magicLinkAttempts.email, normEmail(email)), eq(magicLinkAttempts.windowStart, hourWindow())));
  return (row?.count ?? 0) < config.magicLinkHourlyLimit;
}

/** Atomic increment; the authoritative check (called from sendVerificationRequest). */
export async function consumeMagicLinkQuota(email: string): Promise<boolean> {
  const [row] = await getDb()
    .insert(magicLinkAttempts)
    .values({ email: normEmail(email), windowStart: hourWindow(), count: 1 })
    .onConflictDoUpdate({
      target: [magicLinkAttempts.email, magicLinkAttempts.windowStart],
      set: { count: sql`${magicLinkAttempts.count} + 1` },
    })
    .returning({ count: magicLinkAttempts.count });
  return row.count <= config.magicLinkHourlyLimit;
}

/** Rolling 24 h count of saved analyses; served by the (user_id, created_at) index. */
export async function analyzeCallsLast24h(userId: string): Promise<number> {
  const since = new Date(Date.now() - 86_400_000);
  const [row] = await getDb()
    .select({ n: count() })
    .from(feedbackEntries)
    .where(and(eq(feedbackEntries.userId, userId), gte(feedbackEntries.createdAt, since)));
  return row?.n ?? 0;
}
