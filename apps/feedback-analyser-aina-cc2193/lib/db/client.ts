import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

export class DbNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set");
    this.name = "DbNotConfiguredError";
  }
}

let cached: Db | undefined;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// Lazy so the app (and /api/health) boots without a database.
export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new DbNotConfiguredError();
  cached = drizzle({ client: neon(url), schema });
  return cached;
}
