import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as healthRoute from "@/app/api/health/route";

const ROOT = process.cwd();
const sourceFiles = (dir: string) =>
  (readdirSync(path.join(ROOT, dir), { recursive: true }) as string[])
    .filter((f) => /\.(t|j)sx?$/.test(f))
    .map((f) => path.join(dir, f).split(path.sep).join("/"));

describe("P0.8 landing page + Plausible", () => {
  it("loads the Plausible script only from the public (marketing) layout", () => {
    const files = [...sourceFiles("app"), ...sourceFiles("components")];
    const withPlausible = files.filter((f) => readFileSync(path.join(ROOT, f), "utf8").includes("plausible.io"));
    expect(withPlausible).toEqual(["app/(marketing)/layout.tsx"]);
  });

  it("public pages live under (marketing); signed-in pages and /signin do not", () => {
    for (const p of ["page.tsx", "privacy/page.tsx", "terms/page.tsx"])
      expect(existsSync(path.join(ROOT, "app/(marketing)", p))).toBe(true);
    for (const p of ["connect", "analyze", "dashboard", "account"]) {
      expect(existsSync(path.join(ROOT, "app/(app)", p, "page.tsx"))).toBe(true);
      expect(existsSync(path.join(ROOT, "app/(marketing)", p))).toBe(false);
    }
    expect(existsSync(path.join(ROOT, "app/(marketing)/signin"))).toBe(false);
  });

  it("terms prohibit pasting PHI", () => {
    expect(readFileSync(path.join(ROOT, "app/(marketing)/terms/page.tsx"), "utf8")).toMatch(/protected health information/i);
  });

  it("GET /api/health returns 200 when SELECT 1 succeeds", async () => {
    const res = await healthRoute.GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "ok" });
  });
});
