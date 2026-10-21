// Usage: npm run db:seed -- <workspace-id>
// The workspace id is the value of your browser's `fa_workspace` cookie (open /dashboard once to get one).
// Creates (or reuses) that workspace and replaces its sample entries.
import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";
import { SAMPLE_FEEDBACK, SAMPLE_MODEL_ID } from "../lib/sample-data";
import { isWorkspaceId } from "../lib/workspace-cookie";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const id = process.argv[2]?.trim().toLowerCase();
  if (!isWorkspaceId(id)) {
    console.error("Usage: npm run db:seed -- <workspace-id from the fa_workspace cookie>");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) in .env.local");
  const db = drizzle({ client: neon(url), schema });
  const { users, feedbackEntries, labelCorrections } = schema;

  await db.insert(users).values({ id, email: `${id}@guest.invalid` }).onConflictDoNothing({ target: users.id });
  const user = { id };

  await db.delete(feedbackEntries)
    .where(and(eq(feedbackEntries.userId, user.id), eq(feedbackEntries.modelId, SAMPLE_MODEL_ID)));

  const now = Date.now();
  const rows = await db.insert(feedbackEntries).values(SAMPLE_FEEDBACK.map((s, i) => {
    const at = new Date(now - s.daysAgo * 86_400_000 - i * 60_000);
    return {
      userId: user.id, rawText: s.rawText, sentiment: s.sentiment, category: s.category, summary: s.summary,
      provider: "openai" as const, modelId: SAMPLE_MODEL_ID, createdAt: at, updatedAt: at,
    };
  })).returning({ id: feedbackEntries.id, rawText: feedbackEntries.rawText });

  const corrections = SAMPLE_FEEDBACK.flatMap((s) => {
    if (!s.correction) return [];
    const row = rows.find((r) => r.rawText === s.rawText)!;
    return [{ userId: user.id, entryId: row.id, field: s.correction.field, oldValue: s.correction.oldValue,
      newValue: s[s.correction.field], createdAt: new Date() }];
  });
  if (corrections.length) await db.insert(labelCorrections).values(corrections);

  console.log(`Seeded ${rows.length} entries and ${corrections.length} correction(s) for workspace ${id}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
