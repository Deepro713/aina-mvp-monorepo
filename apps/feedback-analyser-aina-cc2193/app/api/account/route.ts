import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { apiRoute, parseInput, readJson, requireUserId } from "@/lib/api/http";
import { getDb } from "@/lib/db/client";
import { magicLinkAttempts, users, verificationTokens } from "@/lib/db/schema";
import { accountDeleteSchema } from "@/lib/validation";

export const runtime = "nodejs";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export const DELETE = apiRoute("account.delete", async (ctx) => {
  const userId = await requireUserId(ctx);
  const { confirm_email } = parseInput(accountDeleteSchema, await readJson(ctx.req));
  const db = getDb();
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (!user) throw new ApiError(404, "not_found", "Account not found.");
  if (confirm_email.toLowerCase() !== user.email.toLowerCase()) {
    throw new ApiError(422, "confirmation_mismatch", "Type your account email exactly to confirm.",
      { fields: { confirm_email: "Doesn't match your account email" } });
  }
  // users → sessions, accounts, model_connections, feedback_entries, label_corrections all cascade.
  await db.batch([
    db.delete(verificationTokens).where(eq(verificationTokens.identifier, user.email)),
    db.delete(magicLinkAttempts).where(eq(magicLinkAttempts.email, user.email)),
    db.delete(users).where(eq(users.id, userId)),
  ]);
  const res = new NextResponse(null, { status: 204 });
  for (const name of SESSION_COOKIES) {
    res.cookies.set(name, "", { maxAge: 0, path: "/", httpOnly: true, sameSite: "lax", secure: name.startsWith("__Secure-") });
  }
  return res;
}, { mutating: true });
