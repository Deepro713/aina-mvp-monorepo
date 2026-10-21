import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as accountRoute from "@/app/api/account/route";
import * as analyzeRoute from "@/app/api/analyze/route";
import * as connectionRoute from "@/app/api/connection/route";
import * as connectionTestRoute from "@/app/api/connection/test/route";
import * as entryRoute from "@/app/api/entries/[id]/route";
import * as entriesRoute from "@/app/api/entries/route";
import * as healthRoute from "@/app/api/health/route";
import * as statsRoute from "@/app/api/stats/route";
import { isWorkspaceId } from "@/lib/workspace-cookie";
import { call, type CallOpts } from "./helpers/http";

describe("workspace cookie", () => {
  it("only accepts UUIDs as workspace ids", () => {
    expect(isWorkspaceId(randomUUID())).toBe(true);
    expect(isWorkspaceId("")).toBe(false);
    expect(isWorkspaceId(undefined)).toBe(false);
    expect(isWorkspaceId("../../etc")).toBe(false);
  });
});

describe("every private /api route needs a workspace", () => {
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
    ["DELETE /api/account", accountRoute.DELETE, { method: "DELETE", body: { confirm: "delete" } }],
  ];

  it.each(cases)("%s → 401 without a workspace cookie", async (_name, handler, opts) => {
    const r = await call(handler, opts);
    expect(r.status).toBe(401);
    expect(r.json.error.code).toBe("unauthorized");
  });

  it("GET /api/health stays public", async () => {
    const res = await healthRoute.GET();
    expect(res.status).toBe(200);
  });
});
