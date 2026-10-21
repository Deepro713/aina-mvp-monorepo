// Display metadata keyed by the schema's enum TYPES. Record<Sentiment, …> fails to compile if
// lib/db/schema.ts gains or loses a value, so this can't drift (and keeps drizzle out of the client bundle).
import type { Category, Provider, Sentiment } from "@/lib/db/schema";
import type { PillTone } from "@/components/kit";

export const SENTIMENT_META: Record<Sentiment, { label: string; tone: PillTone; color: string }> = {
  positive: { label: "Positive", tone: "emerald", color: "#16a34a" },
  neutral: { label: "Neutral", tone: "slate", color: "#64748b" },
  negative: { label: "Negative", tone: "rose", color: "#dc2626" },
  mixed: { label: "Mixed", tone: "amber", color: "#f59e0b" },
};

// Neutral hues only, so green/red/amber keep their sentiment meaning.
export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  bug: { label: "Bug", color: "#818cf8" },
  feature_request: { label: "Feature request", color: "#a78bfa" },
  pricing_billing: { label: "Pricing & billing", color: "#38bdf8" },
  usability: { label: "Usability", color: "#22d3ee" },
  support: { label: "Support", color: "#60a5fa" },
  praise: { label: "Praise", color: "#e879f9" },
  other: { label: "Other", color: "#94a3b8" },
};

export const PROVIDER_META: Record<Provider, {
  label: string; blurb: string; modelPlaceholder: string; keyPlaceholder: string; keyRequired: boolean;
}> = {
  openai: { label: "OpenAI", blurb: "GPT-4o, GPT-4.1 and newer", modelPlaceholder: "gpt-4o-mini", keyPlaceholder: "sk-…", keyRequired: true },
  anthropic: { label: "Anthropic", blurb: "Claude models", modelPlaceholder: "claude-haiku-4-5", keyPlaceholder: "sk-ant-…", keyRequired: true },
  google: { label: "Gemini", blurb: "Google AI Studio key", modelPlaceholder: "gemini-2.5-flash", keyPlaceholder: "AIza…", keyRequired: true },
  openai_compatible: {
    label: "OpenAI-compatible", blurb: "Ollama, vLLM, LM Studio… on a public HTTPS URL",
    modelPlaceholder: "llama3.1", keyPlaceholder: "Optional for keyless endpoints", keyRequired: false,
  },
};

export const SENTIMENT_KEYS = Object.keys(SENTIMENT_META) as Sentiment[];
export const CATEGORY_KEYS = Object.keys(CATEGORY_META) as Category[];
export const PROVIDER_KEYS = Object.keys(PROVIDER_META) as Provider[];
