import { APICallError, generateObject, generateText, LoadAPIKeyError, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { CATEGORIES, SENTIMENTS } from "@/lib/db/schema";
import { config } from "@/lib/env";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { extractJson, normalizeClassification, type Classification } from "./normalize";
import { buildModel, PROVIDER_LABELS, type ResolvedConnection } from "./providers";
import { SsrfError, ssrfToApiError } from "./ssrf";

// Loose on purpose: strict enum checks happen after normalisation, so "Feature Request" isn't a hard failure.
const looseSchema = z.object({
  sentiment: z.string().describe(`One of: ${SENTIMENTS.join(", ")}`),
  category: z.string().describe(`One of: ${CATEGORIES.join(", ")}`),
  summary: z.string().describe("One sentence, at most 25 words"),
});

function findInChain(e: unknown, pred: (x: unknown) => boolean): unknown {
  let cur: unknown = e;
  for (let i = 0; i < 6 && cur; i++) {
    if (pred(cur)) return cur;
    const c = cur as { cause?: unknown; lastError?: unknown };
    cur = c.cause ?? c.lastError;
  }
  return undefined;
}

export function toProviderApiError(e: unknown, conn: ResolvedConnection, timeoutMs: number): ApiError {
  if (e instanceof ApiError) return e;
  const label = PROVIDER_LABELS[conn.provider];
  const ssrf = findInChain(e, (x) => x instanceof SsrfError);
  if (ssrf) return ssrfToApiError(ssrf as SsrfError);
  const isAbort = (x: unknown) => {
    const n = (x as { name?: string })?.name;
    return n === "TimeoutError" || n === "AbortError";
  };
  if (findInChain(e, isAbort))
    return new ApiError(504, "provider_timeout",
      `${label} timed out after ${Math.round(timeoutMs / 1000)} s. Nothing was saved.`, { retryable: true });
  if (findInChain(e, (x) => LoadAPIKeyError.isInstance(x)))
    return new ApiError(422, "api_key_required", `${label} needs an API key.`, { fields: { api_key: "Required" } });
  const api = findInChain(e, (x) => APICallError.isInstance(x)) as APICallError | undefined;
  if (api) {
    // Provider bodies are never echoed: they can contain key fragments.
    switch (api.statusCode) {
      case 401: case 403:
        return new ApiError(502, "provider_auth_failed", `${label} rejected the API key.`, { retryable: false });
      case 404:
        return new ApiError(502, "model_not_found", `${label} doesn't recognise model "${conn.modelId}".`, { retryable: false });
      case 429:
        return new ApiError(429, "provider_rate_limited", `${label} rate-limited this request. Wait a moment and retry.`, { retryable: true });
      case 400: case 422:
        return new ApiError(502, "provider_bad_request", `${label} rejected the request. Check the model ID supports chat.`, { retryable: false });
      default:
        return new ApiError(502, "provider_error", `${label} returned an error. Nothing was saved.`, { retryable: true });
    }
  }
  return new ApiError(502, "provider_unreachable", `Couldn't reach ${label}. Nothing was saved.`, { retryable: true });
}

async function callModel(conn: ResolvedConnection, rawText: string, isRetry: boolean, signal: AbortSignal) {
  const common = {
    model: buildModel(conn),
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(rawText, isRetry),
    maxOutputTokens: config.llmMaxOutputTokens,
    temperature: 0,
    maxRetries: 0, // our own single retry only; SDK retries would blow the 60 s budget
    abortSignal: signal,
  };
  // Compatible/local models often ignore JSON-schema modes: prompt-level JSON + our parser.
  if (conn.provider === "openai_compatible") {
    const { text } = await generateText(common);
    return extractJson(text);
  }
  try {
    const { object } = await generateObject({ ...common, schema: looseSchema, schemaName: "feedback_classification" });
    return object;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) return extractJson(e.text);
    throw e;
  }
}

export async function classifyFeedback(
  conn: ResolvedConnection, rawText: string, deadline: number,
): Promise<Classification> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 2_000) break;
    const timeoutMs = Math.min(config.llmTimeoutMs, remaining);
    let raw: unknown;
    try {
      raw = await callModel(conn, rawText, attempt > 1, AbortSignal.timeout(timeoutMs));
    } catch (e) {
      throw toProviderApiError(e, conn, timeoutMs);
    }
    const result = normalizeClassification(raw);
    if (result.ok) return result.value;
  }
  throw new ApiError(502, "model_invalid_output",
    `${PROVIDER_LABELS[conn.provider]} returned output that failed validation after 1 retry. Nothing was saved.`,
    { retryable: true });
}

export async function pingModel(conn: ResolvedConnection, timeoutMs: number): Promise<number> {
  const started = Date.now();
  try {
    await generateText({
      model: buildModel(conn),
      prompt: "Reply with the single word: OK",
      maxOutputTokens: 16,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw toProviderApiError(e, conn, timeoutMs);
  }
  return Date.now() - started;
}
