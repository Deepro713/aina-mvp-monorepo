const int = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
};

export const config = {
  llmTimeoutMs: int("LLM_TIMEOUT_MS", 45_000),
  llmMaxOutputTokens: int("LLM_MAX_OUTPUT_TOKENS", 300),
  analyzeDailyLimit: int("ANALYZE_DAILY_LIMIT", 500),
  analyzeDeadlineMs: 55_000, // under maxDuration=60 with headroom for the DB write
  testTimeoutMs: 25_000, // under maxDuration=30
  magicLinkHourlyLimit: int("MAGIC_LINK_HOURLY_LIMIT", 5),
  magicLinkMaxAgeSeconds: int("MAGIC_LINK_MAX_AGE_SECONDS", 600),
  keyEncryptionVersion: int("KEY_ENCRYPTION_VERSION", 1),
  rawTextMax: 10_000,
  summaryMaxWords: 25,
} as const;
