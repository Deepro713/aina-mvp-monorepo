import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { Provider } from "@/lib/db/schema";
import { guardedFetch } from "./ssrf";

export type ResolvedConnection = {
  provider: Provider;
  modelId: string;
  baseUrl: string | null;
  apiKey: string | null;
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Gemini",
  openai_compatible: "Your endpoint",
};

export function buildModel(c: ResolvedConnection): LanguageModel {
  const apiKey = c.apiKey ?? undefined;
  switch (c.provider) {
    case "openai":
      return createOpenAI({ apiKey })(c.modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(c.modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(c.modelId);
    case "openai_compatible":
      return createOpenAICompatible({
        name: "openai_compatible",
        baseURL: c.baseUrl!,
        apiKey,
        fetch: guardedFetch,
      })(c.modelId);
  }
}
