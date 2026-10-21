import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Test-only values; never real secrets. lib/env.ts reads these at import time.
    env: {
      KEY_ENCRYPTION_SECRET: Buffer.alloc(32, 7).toString("base64"),
      KEY_ENCRYPTION_VERSION: "1",
      ANALYZE_DAILY_LIMIT: "500",
      MAGIC_LINK_HOURLY_LIMIT: "5",
      LLM_TIMEOUT_MS: "45000",
      DATABASE_URL: "postgres://test-only-not-used",
    },
  },
});
