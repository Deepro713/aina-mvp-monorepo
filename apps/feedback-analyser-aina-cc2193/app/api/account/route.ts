import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { apiRoute, parseInput, readJson, requireUserId } from "@/lib/api/http";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { accountDeleteSchema, DELETE_CONFIRM_WORD } from "@/lib/validation";
import { WORKSPACE_COOKIE } from "@/lib/workspace-cookie";

export const runtime = "nodejs";

export const DELETE = apiRoute("account.delete", async (ctx) => {
  const userId = await requireUserId(ctx);
  const { confirm } = parseInput(accountDeleteSchema, await readJson(ctx.req));
  if (confirm.toLowerCase() !== DELETE_CONFIRM_WORD) {
    throw new ApiError(422, "confirmation_mismatch", `Type "${DELETE_CONFIRM_WORD}" exactly to confirm.`,
      { fields: { confirm: `Doesn't match "${DELETE_CONFIRM_WORD}"` } });
  }
  // users → model_connections, feedback_entries, label_corrections all cascade.
  await getDb().delete(users).where(eq(users.id, userId));
  // Drop the cookie so the next visit starts a fresh, empty workspace.
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(WORKSPACE_COOKIE, "", { maxAge: 0, path: "/", httpOnly: true, sameSite: "lax" });
  return res;
}, { mutating: true });
