import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { handlers, signIn } from "@/auth";
import * as accountRoute from "@/app/api/account/route";
import * as analyzeRoute from "@/app/api/analyze/route";
import * as authRoute from "@/app/api/auth/[...nextauth]/route";
import * as connectionRoute from "@/app/api/connection/route";
import * as connectionTestRoute from "@/app/api/connection/test/route";
import * as entryRoute from "@/app/api/entries/[id]/route";
import * as entriesRoute from "@/app/api/entries/route";
import * as healthRoute from "@/app/api/health/route";
import * as statsRoute from "@/app/api/stats/route";
import { requestMagicLink } from "@/app/signin/actions";
import { consumeMagicLinkQuota } from "@/lib/rate-limit";
import { call, type CallOpts } from "./helpers/http";

const signinRequest = (email: string) =>
  new NextRequest("http://localhost/api/auth/signin/resend", {
    method: "POST",
    body: new URLSearchParams({ email, csrfToken: "x" }),
  });

describe("P0.1 magic-link sign-in: rate limit", () => {
  it("allows 5 sends per email per hour and refuses the 6th (case-insensitive)", async () => {
    for (let i = 0; i < 5; i++) expect(await consumeMagicLinkQuota("Ann@Example.com")).toBe(true);
    expect(await consumeMagicLinkQuota("ann@example.com")).toBe(false);
  });

  it("returns 429 with retry-after from the sign-in route once the limit is used, without calling Auth.js", async () => {
    for (let i = 0; i < 5; i++) await consumeMagicLinkQuota("bob@example.com");
    const res = await authRoute.POST(signinRequest("bob@example.com"));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("rate_limited");
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(handlers.POST).not.toHaveBeenCalled();
  });

  it("hands the request to Auth.js while under the limit", async () => {
    const res = await authRoute.POST(signinRequest("carol@example.com"));
    expect(res.status).toBe(200);
    expect(handlers.POST).toHaveBeenCalledOnce();
  });

  it("the /signin form action refuses an over-limit email and never triggers a send", async () => {
    for (let i = 0; i < 5; i++) await consumeMagicLinkQuota("dan@example.com");
    const fd = new FormData();
    fd.set("email", "dan@example.com");
    const state = await requestMagicLink({ status: "idle" }, fd);
    expect(state.status).toBe("error");
    expect(state.message).toMatch(/too many/i);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("the /signin form action rejects an invalid email", async () => {
    const fd = new FormData();
    fd.set("email", "not-an-email");
    expect((await requestMagicLink({ status: "idle" }, fd)).status).toBe("error");
  });
});

describe("P0.1 every private /api route requires a session", () => {
  const id = randomUUID();
  const cases: [string, (req: Request, s?: any) => Promise<Response>, CallOpts][] = [
    ["GET /api/connection", connectionRoute.GET, {}],
    ["PUT /api/connection", connectionRoute.PUT, { method: "PUT", body: { provider: "openai", model_id: "m", api_key: "sk-123456789" } }],
    ["DELETE /api/connection", connectionRoute.DELETE, { method: "DELETE" }],
    ["POST /api/connection/test", connectionTestRoute.POST, { method: "POST", body: {} }],
    ["POST /api/analyze", analyzeRoute.POST, { method: "POST", body: { raw_text: "hi" } }],
    ["GET /api/entries", entriesRoute.GET, { path: "/api/entries" }],
    ["PATCH /api/entries/[id]", entryRoute.PATCH, { method: "PATCH", params: { id }, body: { sentiment: "mixed" } }],
    ["DELETE /api/entries/[id]", entryRoute.DELETE, { method: "DELETE", params: { id } }],
    ["GET /api/stats", statsRoute.GET, { path: "/api/stats" }],
    ["DELETE /api/account", accountRoute.DELETE, { method: "DELETE", body: { confirm_email: "x@example.com" } }],
  ];

  it.each(cases)("%s → 401 unauthorized", async (_name, handler, opts) => {
    const r = await call(handler, opts);
    expect(r.status).toBe(401);
    expect(r.json.error.code).toBe("unauthorized");
  });

  it("GET /api/health stays public", async () => {
    const res = await healthRoute.GET();
    expect(res.status).toBe(200);
  });
});
