import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { decryptApiKey, KeyConfigError } from "@/lib/crypto/keys";
import { getDb } from "@/lib/db/client";
import { modelConnections, type ModelConnection, type Provider } from "@/lib/db/schema";
import type { ResolvedConnection } from "@/lib/llm/providers";
import { assertPublicUrl } from "@/lib/llm/ssrf";

export type ConnectionInput = {
  provider?: Provider; model_id?: string; base_url?: string | null; api_key?: string | null;
};

export async function getConnectionRow(userId: string): Promise<ModelConnection | null> {
  const [row] = await getDb().select().from(modelConnections).where(eq(modelConnections.userId, userId)).limit(1);
  return row ?? null;
}

export function toConnectionDto(row: ModelConnection) {
  return {
    id: row.id,
    provider: row.provider,
    model_id: row.modelId,
    base_url: row.baseUrl,
    key_last4: row.keyLast4,
    last_tested_at: row.lastTestedAt?.toISOString() ?? null,
    updated_at: row.updatedAt.toISOString(),
  };
}

function decryptSaved(row: ModelConnection, userId: string): string | null {
  if (!row.apiKeyEncrypted) return null;
  try {
    return decryptApiKey(row.apiKeyEncrypted, row.keyVersion, userId);
  } catch (e) {
    if (e instanceof KeyConfigError) throw e;
    throw new ApiError(409, "connection_unreadable",
      "Your saved API key can't be decrypted. Re-enter it on the Connect page.");
  }
}

export function resolveSaved(row: ModelConnection, userId: string): ResolvedConnection {
  return { provider: row.provider, modelId: row.modelId, baseUrl: row.baseUrl, apiKey: decryptSaved(row, userId) };
}

export async function normalizeBaseUrl(input: string): Promise<string> {
  let url: URL;
  try { url = new URL(input.trim()); } catch {
    const message = "Enter a full URL like https://ollama.example.com/v1";
    throw new ApiError(422, "invalid_url", message, { fields: { base_url: message } });
  }
  url.hash = "";
  url.search = "";
  if (url.pathname === "/") url.pathname = "/v1"; // Ollama & most compatible servers mount at /v1
  await assertPublicUrl(url); // SsrfError → 422 via apiRoute
  return url.href.replace(/\/+$/, "");
}

const required = (field: string, message: string) =>
  new ApiError(422, "validation_failed", message, { fields: { [field]: message } });

/**
 * Merge request fields with the saved row. The stored key is only reused for the
 * same provider AND the same base URL, so it can never be sent to a new host.
 */
export async function resolveInput(
  userId: string, input: ConnectionInput, saved: ModelConnection | null,
): Promise<{ conn: ResolvedConnection; reusedSavedKey: boolean }> {
  const provider = input.provider ?? saved?.provider;
  if (!provider) throw required("provider", "Choose a provider.");
  const same = saved?.provider === provider ? saved : null;

  const modelId = input.model_id?.trim() || same?.modelId;
  if (!modelId) throw required("model_id", "Enter a model ID.");

  let baseUrl: string | null = null;
  if (provider === "openai_compatible") {
    const raw = input.base_url?.trim() || same?.baseUrl;
    if (!raw) throw required("base_url", "Enter the endpoint's HTTPS base URL.");
    baseUrl = await normalizeBaseUrl(raw);
  }

  let apiKey = input.api_key?.trim() || null;
  let reusedSavedKey = false;
  if (!apiKey && same?.apiKeyEncrypted && (same.baseUrl ?? null) === baseUrl) {
    apiKey = decryptSaved(same, userId);
    reusedSavedKey = true;
  }
  if (!apiKey && provider !== "openai_compatible") {
    throw new ApiError(422, "api_key_required", "Enter an API key.", { fields: { api_key: "Required" } });
  }
  return { conn: { provider, modelId, baseUrl, apiKey }, reusedSavedKey };
}
