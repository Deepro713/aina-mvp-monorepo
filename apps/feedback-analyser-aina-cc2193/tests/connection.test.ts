import { APICallError, generateText } from "ai";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import * as connectionRoute from "@/app/api/connection/route";
import * as testRoute from "@/app/api/connection/test/route";
import { decryptApiKey } from "@/lib/crypto/keys";
import { modelConnections } from "@/lib/db/schema";
import { guardedFetch } from "@/lib/llm/ssrf";
import { getTestDb } from "./helpers/db";
import { seedConnection, signedInUser } from "./helpers/fixtures";
import { call } from "./helpers/http";

const KEY = "sk-live-abcdefghijklmnopqrstuv1234";
const getRow = async (userId: string) =>
  (await getTestDb().select().from(modelConnections).where(eq(modelConnections.userId, userId)))[0];

describe("P0.2 model connection: key storage", () => {
  it("encrypts the key at rest and only ever returns key_last4", async () => {
    const user = await signedInUser();
    const put = await call(connectionRoute.PUT, {
      method: "PUT", body: { provider: "openai", model_id: "gpt-4o-mini", api_key: KEY },
    });
    expect(put.status).toBe(200);
    expect(put.json.key_last4).toBe("1234");

    const get = await call(connectionRoute.GET);
    expect(get.json.connection).toMatchObject({ provider: "openai", model_id: "gpt-4o-mini", key_last4: "1234" });

    const row = await getRow(user.id);
    for (const body of [put.text, get.text]) {
      expect(body).not.toContain(KEY);
      expect(body).not.toContain(row.apiKeyEncrypted!);
      expect(body).not.toMatch(/api_key/);
    }
    expect(row.apiKeyEncrypted).not.toContain(KEY);
    expect(decryptApiKey(row.apiKeyEncrypted!, row.keyVersion, user.id)).toBe(KEY);
    // Ciphertext is bound to its owner: it cannot be decrypted as another user.
    expect(() => decryptApiKey(row.apiKeyEncrypted!, row.keyVersion, "someone-else")).toThrow();
  });

  it("rejects cross-origin writes", async () => {
    await signedInUser();
    const r = await call(connectionRoute.PUT, {
      method: "PUT", headers: { origin: "https://evil.example" },
      body: { provider: "openai", model_id: "gpt-4o-mini", api_key: KEY },
    });
    expect(r.status).toBe(403);
    expect(r.json.error.code).toBe("bad_origin");
  });

  it("DELETE removes the connection", async () => {
    const user = await signedInUser();
    await seedConnection(user.id);
    expect((await call(connectionRoute.DELETE, { method: "DELETE" })).status).toBe(204);
    expect(await getRow(user.id)).toBeUndefined();
  });
});

describe("P0.2 model connection: SSRF guard", () => {
  it.each([
    ["http://ollama.example.com/v1", "https_required"],
    ["https://localhost:11434/v1", "ssrf_blocked"],
    ["https://ollama.local/v1", "ssrf_blocked"],
    ["https://127.0.0.1/v1", "ssrf_blocked"],
    ["https://10.0.0.5/v1", "ssrf_blocked"],
    ["https://169.254.169.254/latest", "ssrf_blocked"],
    ["https://[::1]/v1", "ssrf_blocked"],
  ])("%s → 422 %s, nothing saved, no outbound request", async (base_url, code) => {
    const user = await signedInUser();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const body = { provider: "openai_compatible", model_id: "llama3.1", base_url };

    for (const [handler, method] of [[testRoute.POST, "POST"], [connectionRoute.PUT, "PUT"]] as const) {
      const r = await call(handler, { method, body });
      expect(r.status).toBe(422);
      expect(r.json.error.code).toBe(code);
      expect(r.json.error.fields.base_url).toBeTruthy();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(generateText).not.toHaveBeenCalled();
    expect(await getRow(user.id)).toBeUndefined();
  });

  it("guardedFetch re-checks the target on every call (private IP never fetched)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(guardedFetch("https://10.1.2.3/v1/chat/completions")).rejects.toMatchObject({ code: "ssrf_blocked" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("guardedFetch does not follow redirects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "https://10.0.0.1/" } }),
    );
    await expect(guardedFetch("https://8.8.8.8/v1/chat/completions", { method: "POST" }))
      .rejects.toMatchObject({ code: "redirect_blocked" });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  });
});

describe("P0.2 model connection: test → save", () => {
  const creds = { provider: "openai", model_id: "gpt-4o-mini", api_key: KEY };

  it("a passing test returns latency + token; saving with that token sets last_tested_at", async () => {
    await signedInUser();
    vi.mocked(generateText).mockResolvedValue({ text: "OK" } as never);

    const t = await call(testRoute.POST, { method: "POST", body: creds });
    expect(t.status).toBe(200);
    expect(t.json).toMatchObject({ ok: true, model_id: "gpt-4o-mini" });
    expect(typeof t.json.latency_ms).toBe("number");
    expect(typeof t.json.test_token).toBe("string");

    const put = await call(connectionRoute.PUT, { method: "PUT", body: { ...creds, test_token: t.json.test_token } });
    expect(put.status).toBe(200);
    expect(put.json.last_tested_at).not.toBeNull();
  });

  it("a forged token, or a token for different credentials, does not mark the connection tested", async () => {
    await signedInUser();
    vi.mocked(generateText).mockResolvedValue({ text: "OK" } as never);
    const t = await call(testRoute.POST, { method: "POST", body: creds });

    const forged = await call(connectionRoute.PUT, { method: "PUT", body: { ...creds, test_token: `${Date.now()}.forged` } });
    expect(forged.json.last_tested_at).toBeNull();

    const swapped = await call(connectionRoute.PUT, {
      method: "PUT", body: { ...creds, model_id: "gpt-4o", test_token: t.json.test_token },
    });
    expect(swapped.json.last_tested_at).toBeNull();
  });

  it("re-testing the saved connection (empty body) stamps last_tested_at", async () => {
    const user = await signedInUser();
    await seedConnection(user.id);
    vi.mocked(generateText).mockResolvedValue({ text: "OK" } as never);
    expect((await call(testRoute.POST, { method: "POST", body: {} })).status).toBe(200);
    expect((await getRow(user.id)).lastTestedAt).toBeInstanceOf(Date);
  });

  it("a hung provider returns 504 provider_timeout, retryable", async () => {
    await signedInUser();
    vi.mocked(generateText).mockRejectedValue(Object.assign(new Error("aborted"), { name: "TimeoutError" }));
    const r = await call(testRoute.POST, { method: "POST", body: creds });
    expect(r.status).toBe(504);
    expect(r.json.error).toMatchObject({ code: "provider_timeout", retryable: true });
  });

  it("a rejected key returns 502 provider_auth_failed and never echoes the provider body", async () => {
    await signedInUser();
    vi.mocked(generateText).mockRejectedValue(new APICallError({
      message: "Unauthorized", url: "https://api.openai.com/v1/chat/completions", requestBodyValues: {},
      statusCode: 401, responseBody: '{"error":"Incorrect API key sk-live-LEAKED-FRAGMENT"}',
    }));
    const r = await call(testRoute.POST, { method: "POST", body: creds });
    expect(r.status).toBe(502);
    expect(r.json.error.code).toBe("provider_auth_failed");
    expect(r.text).not.toContain("LEAKED");
    expect(r.text).not.toContain(KEY);
  });
});
