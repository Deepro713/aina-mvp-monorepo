import { lookup } from "node:dns/promises";
import * as ipaddr from "ipaddr.js";
import { ApiError } from "@/lib/api/errors";

export type SsrfCode = "https_required" | "ssrf_blocked" | "invalid_url" | "host_unresolvable" | "redirect_blocked";

export class SsrfError extends Error {
  readonly code: SsrfCode;
  constructor(code: SsrfCode, message: string) {
    super(message);
    this.name = "SsrfError";
    this.code = code;
  }
}

const LOCAL_MSG = "Private or localhost URLs can't be reached from our servers. Expose a public HTTPS URL.";
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

export function isPublicIp(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  // process() unwraps IPv4-mapped IPv6 (::ffff:10.0.0.1) so the v4 range check applies.
  return ipaddr.process(address).range() === "unicast";
}

export async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "https:") throw new SsrfError("https_required", "Only https:// endpoints are allowed.");
  if (url.username || url.password)
    throw new SsrfError("invalid_url", "Put credentials in the API key field, not in the URL.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s)))
    throw new SsrfError("ssrf_blocked", LOCAL_MSG);
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new SsrfError("host_unresolvable", `Couldn't resolve ${host}. Check the URL.`);
  }
  if (addrs.length === 0 || addrs.some((a) => !isPublicIp(a.address)))
    throw new SsrfError("ssrf_blocked", LOCAL_MSG);
}

// Passed to the openai-compatible provider: re-validated on EVERY call (not just at save) to blunt DNS rebinding.
export const guardedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  await assertPublicUrl(new URL(href));
  const res = await fetch(input, { ...init, redirect: "manual" });
  if (res.status >= 300 && res.status < 400) {
    await res.body?.cancel();
    throw new SsrfError("redirect_blocked", "The endpoint redirected; redirects aren't followed. Use the final URL.");
  }
  return res;
}) as typeof fetch;

export function ssrfToApiError(e: SsrfError): ApiError {
  return new ApiError(422, e.code, e.message, { retryable: false, fields: { base_url: e.message } });
}
