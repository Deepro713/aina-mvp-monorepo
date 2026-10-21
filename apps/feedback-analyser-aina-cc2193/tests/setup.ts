import { afterAll, beforeAll, beforeEach, vi } from "vitest";
import { generateObject, generateText } from "ai";
import { closeTestDb, initTestDb, resetTestDb } from "./helpers/db";
import { setSession } from "./helpers/session";

// Real SQL, in-memory Postgres (PGlite) instead of Neon.
vi.mock("@/lib/db/client", async () => {
  const h = await import("./helpers/db");
  class DbNotConfiguredError extends Error {}
  return { getDb: () => h.getTestDb(), isDbConfigured: () => true, DbNotConfiguredError };
});

// The workspace cookie is replaced by an injectable "session" (the current workspace user).
vi.mock("@/lib/workspace", async () => {
  const s = await import("./helpers/session");
  return { getWorkspaceUser: vi.fn(async () => s.getSession()?.user ?? null) };
});

// Only the model calls are faked; error classes (APICallError, …) stay real.
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateObject: vi.fn(),
  generateText: vi.fn(),
}));

beforeAll(async () => { await initTestDb(); });
afterAll(async () => { await closeTestDb(); });

beforeEach(async () => {
  await resetTestDb();
  setSession(null);
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.mocked(generateObject).mockReset();
  vi.mocked(generateText).mockReset();
});
