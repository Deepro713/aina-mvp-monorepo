import { randomUUID } from "node:crypto";
import { encryptApiKey, lastFour } from "@/lib/crypto/keys";
import {
  feedbackEntries, modelConnections, users, type Category, type Provider, type Sentiment,
} from "@/lib/db/schema";
import { getTestDb } from "./db";
import { setSession } from "./session";

const DAY = 86_400_000;
let seq = 0;

export async function createUser(email = `user${++seq}@example.com`) {
  const id = randomUUID();
  await getTestDb().insert(users).values({ id, email });
  return { id, email };
}

export async function signedInUser(email?: string) {
  const u = await createUser(email);
  setSession(u);
  return u;
}

export async function seedConnection(
  userId: string,
  over: { provider?: Provider; modelId?: string; baseUrl?: string | null; apiKey?: string | null } = {},
) {
  const provider = over.provider ?? "openai";
  const apiKey = over.apiKey === undefined ? "sk-test-seeded-key-9876" : over.apiKey;
  const enc = apiKey ? encryptApiKey(apiKey, userId) : null;
  const [row] = await getTestDb().insert(modelConnections).values({
    userId,
    provider,
    modelId: over.modelId ?? "gpt-4o-mini",
    baseUrl: over.baseUrl ?? null,
    apiKeyEncrypted: enc?.ciphertext ?? null,
    keyVersion: enc?.version ?? 1,
    keyLast4: apiKey ? lastFour(apiKey) : null,
  }).returning();
  return row;
}

let entrySeq = 0;
export async function seedEntry(
  userId: string,
  over: { sentiment?: Sentiment; category?: Category; daysAgo?: number; rawText?: string } = {},
) {
  // Distinct millisecond timestamps keep newest-first ordering deterministic.
  const at = new Date(Date.now() - (over.daysAgo ?? 0) * DAY - ++entrySeq * 1000);
  const [row] = await getTestDb().insert(feedbackEntries).values({
    userId,
    rawText: over.rawText ?? `feedback #${entrySeq}`,
    sentiment: over.sentiment ?? "negative",
    category: over.category ?? "bug",
    summary: "Customer reports a problem.",
    provider: "openai",
    modelId: "gpt-4o-mini",
    createdAt: at,
    updatedAt: at,
  }).returning();
  return row;
}

export const VALID_OUTPUT = {
  sentiment: "negative",
  category: "pricing_billing",
  summary: "Customer reports being charged twice at checkout.",
};
