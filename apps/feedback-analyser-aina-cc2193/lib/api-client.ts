// Browser-side wrapper around the backend's { error: { code, message, retryable?, fields?, request_id? } } envelope.
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly fields?: Record<string, string>;
  constructor(status: number, code: string, message: string,
    extra: { retryable?: boolean; fields?: Record<string, string> } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.retryable = extra.retryable ?? false;
    this.fields = extra.fields;
  }
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(0, "network_error", "Couldn't reach the server. Check your connection and retry.", { retryable: true });
  }
  if (res.status === 401 && typeof window !== "undefined") window.location.assign("/signin");
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error ?? {};
    const ref = e.request_id ? ` (ref ${String(e.request_id).slice(0, 8)})` : "";
    throw new ApiClientError(res.status, e.code ?? `http_${res.status}`,
      (e.message ?? `Request failed (${res.status}).`) + ref,
      { retryable: e.retryable ?? res.status >= 500, fields: e.fields });
  }
  return body as T;
}

export function toClientError(e: unknown): ApiClientError {
  return e instanceof ApiClientError
    ? e
    : new ApiClientError(0, "unknown", "Something went wrong. Try again.", { retryable: true });
}
