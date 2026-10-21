const posInt = (raw: string | undefined, fallback: number) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export const PRODUCT_NAME = "Feedback Sentiment Analyser";

const envRepo = process.env.NEXT_PUBLIC_REPO_URL?.trim().replace(/\/+$/, "");
// Placeholder until NEXT_PUBLIC_REPO_URL is set in Vercel.
export const REPO_URL = envRepo || "https://github.com/YOUR-ORG/feedback-analyser-aina";
export const REPO_URL_IS_PLACEHOLDER = !envRepo;

export const BATCH_MAX = posInt(process.env.NEXT_PUBLIC_BATCH_MAX_ENTRIES, 25);
export const BATCH_CONCURRENCY = posInt(process.env.NEXT_PUBLIC_BATCH_CONCURRENCY, 3);
export const RAW_TEXT_MAX = 10_000;
