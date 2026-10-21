import { NextResponse } from "next/server";
import type { z } from "zod";
import { auth } from "@/auth";
import { DbNotConfiguredError } from "@/lib/db/client";
import { KeyConfigError } from "@/lib/crypto/keys";
import { SsrfError, ssrfToApiError } from "@/lib/llm/ssrf";
import { log, type LogFields } from "@/lib/log";
import { ApiError } from "./errors";

export type RouteCtx<P> = { req: Request; requestId: string; params: P; log: LogFields };

export function errorResponse(err: ApiError, requestId: string): NextResponse {
  const { retryable, fields, retryAfterSeconds } = err.extra;
  const body = {
    error: {
      code: err.code,
      message: err.message,
      ...(retryable !== undefined ? { retryable } : {}),
      ...(fields ? { fields } : {}),
      ...(err.status >= 500 ? { request_id: requestId } : {}),
    },
  };
  const headers: Record<string, string> = {};
  if (retryAfterSeconds) headers["retry-after"] = String(retryAfterSeconds);
  return NextResponse.json(body, { status: err.status, headers });
}

function toApiError(err: unknown, fields: LogFields): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof SsrfError) return ssrfToApiError(err);
  if (err instanceof DbNotConfiguredError)
    return new ApiError(503, "db_not_configured", "The database isn't configured yet.");
  if (err instanceof KeyConfigError)
    return new ApiError(503, "encryption_not_configured", "Key encryption isn't configured on the server.");
  // Never log err.message: driver errors can embed query params (raw feedback text).
  const e = err as { name?: string; code?: string };
  fields.error_name = e?.name ?? typeof err;
  fields.error_pg_code = e?.code;
  return new ApiError(500, "internal_error", "Something went wrong on our side. Nothing was saved.");
}

function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients still need the session cookie
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost = "";
  try { originHost = new URL(origin).host; } catch { /* malformed → mismatch */ }
  if (originHost !== host) throw new ApiError(403, "bad_origin", "Cross-origin request rejected.");
}

export function apiRoute<P extends Record<string, string> = Record<string, string>>(
  name: string,
  fn: (ctx: RouteCtx<P>) => Promise<Response>,
  opts: { mutating?: boolean } = {},
) {
  return async (req: Request, segment?: { params: Promise<P> }): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const started = Date.now();
    const fields: LogFields = { route: name, method: req.method, request_id: requestId };
    let res: Response;
    try {
      if (opts.mutating) assertSameOrigin(req);
      const params = (segment ? await segment.params : {}) as P;
      res = await fn({ req, requestId, params, log: fields });
    } catch (err) {
      const apiErr = toApiError(err, fields);
      fields["error.code"] = apiErr.code;
      res = errorResponse(apiErr, requestId);
    }
    res.headers.set("x-request-id", requestId);
    log(res.status >= 500 ? "error" : res.status >= 400 ? "warn" : "info", {
      ...fields, status: res.status, latency_ms: Date.now() - started,
    });
    return res;
  };
}

export async function requireUserId(ctx: RouteCtx<unknown>): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new ApiError(401, "unauthorized", "Sign in to continue.");
  ctx.log.user_id = id;
  return id;
}

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text.trim()) return {};
  try { return JSON.parse(text); } catch {
    throw new ApiError(400, "bad_json", "Request body must be valid JSON.");
  }
}

export function parseInput<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    fields[key] ??= issue.message;
  }
  throw new ApiError(422, "validation_failed", "Some fields are invalid.", { fields });
}

export const searchParams = (req: Request) => Object.fromEntries(new URL(req.url).searchParams);
