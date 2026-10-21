// Shared enums are the single source of truth for labels (zod, prompts, UI all import these).
import { sql } from "drizzle-orm";
import {
  check, index, integer, pgEnum, pgTable, primaryKey, smallint, text, timestamp, uuid,
} from "drizzle-orm/pg-core";

export const SENTIMENTS = ["positive", "neutral", "negative", "mixed"] as const;
export const CATEGORIES = [
  "bug", "feature_request", "pricing_billing", "usability", "support", "praise", "other",
] as const;
export const PROVIDERS = ["openai", "anthropic", "google", "openai_compatible"] as const;
export const LABEL_FIELDS = ["sentiment", "category"] as const;

export type Sentiment = (typeof SENTIMENTS)[number];
export type Category = (typeof CATEGORIES)[number];
export type Provider = (typeof PROVIDERS)[number];
export type LabelField = (typeof LABEL_FIELDS)[number];

export const sentimentEnum = pgEnum("sentiment", SENTIMENTS);
export const categoryEnum = pgEnum("category", CATEGORIES);
export const providerEnum = pgEnum("provider", PROVIDERS);
export const labelFieldEnum = pgEnum("label_field", LABEL_FIELDS);

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ── Users ───────────────────────────────────────────────────
// One row per anonymous browser workspace (see lib/workspace.ts); email is a placeholder.
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: tz("email_verified"),
  image: text("image"),
  createdAt: tz("created_at").notNull().defaultNow(),
});

// Legacy tables from the removed magic-link sign-in. Unused; kept so existing databases don't need a migration.
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: tz("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(), // Auth.js stores this hashed
    expires: tz("expires").notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const magicLinkAttempts = pgTable(
  "magic_link_attempts",
  {
    email: text("email").notNull(),
    windowStart: tz("window_start").notNull(),
    count: integer("count").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.email, t.windowStart] })],
);

// ── App tables ──────────────────────────────────────────────
export const modelConnections = pgTable(
  "model_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    provider: providerEnum("provider").notNull(),
    modelId: text("model_id").notNull(),
    baseUrl: text("base_url"),
    apiKeyEncrypted: text("api_key_encrypted"), // iv:tag:ciphertext (base64)
    keyVersion: smallint("key_version").notNull().default(1),
    keyLast4: text("key_last4"),
    lastTestedAt: tz("last_tested_at"),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("base_url_required_for_compatible",
      sql`${t.provider} <> 'openai_compatible' OR ${t.baseUrl} IS NOT NULL`),
  ],
);

// created_at is always written by the app (ms precision) so keyset cursors round-trip exactly through JS Dates.
export const feedbackEntries = pgTable(
  "feedback_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    rawText: text("raw_text").notNull(),
    sentiment: sentimentEnum("sentiment").notNull(),
    category: categoryEnum("category").notNull(),
    summary: text("summary").notNull(),
    provider: providerEnum("provider").notNull(),
    modelId: text("model_id").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("raw_text_len", sql`char_length(${t.rawText}) <= 10000`),
    index("feedback_entries_user_created_idx").on(t.userId, t.createdAt.desc()),
  ],
);

export const labelCorrections = pgTable(
  "label_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id").references(() => feedbackEntries.id, { onDelete: "set null" }),
    field: labelFieldEnum("field").notNull(),
    oldValue: text("old_value").notNull(),
    newValue: text("new_value").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [index("label_corrections_user_created_idx").on(t.userId, t.createdAt)],
);

export type ModelConnection = typeof modelConnections.$inferSelect;
export type FeedbackEntry = typeof feedbackEntries.$inferSelect;
export type LabelCorrection = typeof labelCorrections.$inferSelect;
