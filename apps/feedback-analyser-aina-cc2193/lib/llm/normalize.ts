import { z } from "zod";
import { CATEGORIES, SENTIMENTS, type Category, type Sentiment } from "@/lib/db/schema";
import { config } from "@/lib/env";

const SENTIMENT_ALIASES: Record<string, Sentiment> = {
  pos: "positive", good: "positive", happy: "positive",
  neg: "negative", bad: "negative", angry: "negative", frustrated: "negative",
  neutral_sentiment: "neutral", none: "neutral",
  mix: "mixed", mixed_sentiment: "mixed", ambivalent: "mixed", positive_and_negative: "mixed",
};

const CATEGORY_ALIASES: Record<string, Category> = {
  bug_report: "bug", bugs: "bug", defect: "bug", error: "bug", issue: "bug", crash: "bug",
  feature: "feature_request", features: "feature_request", feature_requests: "feature_request",
  request: "feature_request", enhancement: "feature_request", suggestion: "feature_request",
  pricing: "pricing_billing", billing: "pricing_billing", pricing_and_billing: "pricing_billing",
  price: "pricing_billing", payment: "pricing_billing", payments: "pricing_billing", refund: "pricing_billing",
  ux: "usability", ui: "usability", ui_ux: "usability", design: "usability", performance: "usability",
  customer_support: "support", customer_service: "support", service: "support", documentation: "support",
  compliment: "praise", positive_feedback: "praise", kudos: "praise",
  misc: "other", general: "other", uncategorized: "other", unknown: "other",
};

const slug = (v: unknown) =>
  typeof v === "string" ? v.trim().toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "") : "";

export function normalizeSentiment(v: unknown): string {
  const s = slug(v);
  return (SENTIMENTS as readonly string[]).includes(s) ? s : SENTIMENT_ALIASES[s] ?? s;
}

export function normalizeCategory(v: unknown): string {
  const s = slug(v);
  return (CATEGORIES as readonly string[]).includes(s) ? s : CATEGORY_ALIASES[s] ?? s;
}

export const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function normalizeSummary(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.replace(/\s+/g, " ").trim().replace(/^["'“]+|["'”]+$/g, "");
  const words = s.split(" ").filter(Boolean);
  if (words.length <= config.summaryMaxWords) return s;
  return words.slice(0, config.summaryMaxWords).join(" ").replace(/[,;:]$/, "") + "…";
}

export const classificationSchema = z.object({
  sentiment: z.enum(SENTIMENTS),
  category: z.enum(CATEGORIES),
  summary: z.string().min(3).max(400)
    .refine((s) => wordCount(s) <= config.summaryMaxWords, { message: "summary too long" }),
});
export type Classification = z.infer<typeof classificationSchema>;

// Small/local models wrap JSON in prose, fences, or <think> blocks.
export function extractJson(text: string | undefined | null): unknown {
  if (!text) return null;
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

export function normalizeClassification(
  raw: unknown,
): { ok: true; value: Classification } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "not_an_object" };
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) lower[k.toLowerCase()] = v;
  const candidate = {
    sentiment: normalizeSentiment(lower.sentiment),
    category: normalizeCategory(lower.category),
    summary: normalizeSummary(lower.summary),
  };
  const r = classificationSchema.safeParse(candidate);
  return r.success
    ? { ok: true, value: r.data }
    : { ok: false, reason: r.error.issues.map((i) => i.path.join(".")).join(",") };
}
