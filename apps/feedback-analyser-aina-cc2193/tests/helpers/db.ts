import { existsSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/db/schema";

type TestDb = PgliteDatabase<typeof schema> & {
  batch: (queries: readonly PromiseLike<unknown>[]) => Promise<unknown[]>;
};

let client: PGlite | undefined;
let db: TestDb | undefined;

// Mirrors lib/db/schema.ts. Used only until `npm run db:generate` has produced drizzle/.
const FALLBACK_DDL = `
CREATE TYPE sentiment AS ENUM ('positive','neutral','negative','mixed');
CREATE TYPE category AS ENUM ('bug','feature_request','pricing_billing','usability','support','praise','other');
CREATE TYPE provider AS ENUM ('openai','anthropic','google','openai_compatible');
CREATE TYPE label_field AS ENUM ('sentiment','category');
CREATE TABLE users (
  id text PRIMARY KEY, name text, email text NOT NULL UNIQUE, email_verified timestamptz, image text,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE accounts (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, type text NOT NULL, provider text NOT NULL,
  provider_account_id text NOT NULL, refresh_token text, access_token text, expires_at integer, token_type text,
  scope text, id_token text, session_state text, PRIMARY KEY (provider, provider_account_id));
CREATE TABLE sessions (
  session_token text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires timestamptz NOT NULL);
CREATE TABLE verification_tokens (
  identifier text NOT NULL, token text NOT NULL, expires timestamptz NOT NULL, PRIMARY KEY (identifier, token));
CREATE TABLE magic_link_attempts (
  email text NOT NULL, window_start timestamptz NOT NULL, count integer NOT NULL DEFAULT 1, PRIMARY KEY (email, window_start));
CREATE TABLE model_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  provider provider NOT NULL, model_id text NOT NULL, base_url text, api_key_encrypted text,
  key_version smallint NOT NULL DEFAULT 1, key_last4 text, last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT base_url_required_for_compatible CHECK (provider <> 'openai_compatible' OR base_url IS NOT NULL));
CREATE TABLE feedback_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text text NOT NULL, sentiment sentiment NOT NULL, category category NOT NULL, summary text NOT NULL,
  provider provider NOT NULL, model_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT raw_text_len CHECK (char_length(raw_text) <= 10000));
CREATE INDEX feedback_entries_user_created_idx ON feedback_entries (user_id, created_at DESC);
CREATE TABLE label_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES feedback_entries(id) ON DELETE SET NULL,
  field label_field NOT NULL, old_value text NOT NULL, new_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now());
`;

export async function initTestDb(): Promise<void> {
  client = new PGlite();
  const d = drizzle({ client, schema }) as TestDb;
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  if (existsSync(path.join(migrationsFolder, "meta", "_journal.json"))) {
    await migrate(d, { migrationsFolder });
  } else {
    await client.exec(FALLBACK_DDL);
  }
  // neon-http's db.batch() runs as one transaction; sequential execution is enough for behaviour tests.
  d.batch = async (queries) => {
    const out: unknown[] = [];
    for (const q of queries) out.push(await q);
    return out;
  };
  db = d;
}

export function getTestDb(): TestDb {
  if (!db) throw new Error("Test DB not initialised");
  return db;
}

export async function resetTestDb(): Promise<void> {
  await client?.exec("TRUNCATE users, magic_link_attempts, verification_tokens CASCADE;");
}

export async function closeTestDb(): Promise<void> {
  await client?.close();
  client = undefined;
  db = undefined;
}
