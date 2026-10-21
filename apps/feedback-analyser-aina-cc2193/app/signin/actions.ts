"use server";

import { z } from "zod";
import { signIn } from "@/auth";
import { log } from "@/lib/log";
import { canSendMagicLink } from "@/lib/rate-limit";

export type MagicLinkState = { status: "idle" | "sent" | "error"; message?: string };

/** Server action for the /signin form (use with useActionState). */
export async function requestMagicLink(_prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { status: "error", message: "Enter a valid email address." };
  try {
    if (!(await canSendMagicLink(parsed.data)))
      return { status: "error", message: "Too many sign-in links requested. Try again within the hour." };
    await signIn("resend", { email: parsed.data, redirect: false, redirectTo: "/dashboard" });
    return { status: "sent" };
  } catch (e) {
    log("error", { route: "signin.action", error_name: (e as Error)?.name });
    return { status: "error", message: "We couldn't send the link. Try again in a minute." };
  }
}
