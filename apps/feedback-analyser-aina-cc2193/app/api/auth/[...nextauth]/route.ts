import { NextResponse, type NextRequest } from "next/server";
import { handlers } from "@/auth";
import { canSendMagicLink, secondsUntilNextWindow } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const { GET } = handlers;

// Pre-check so over-limit sends get a 429 JSON instead of Auth.js's generic error redirect.
export async function POST(req: NextRequest) {
  if (new URL(req.url).pathname.endsWith("/signin/resend")) {
    const form = await req.clone().formData().catch(() => null);
    const email = form?.get("email");
    if (typeof email === "string" && email && !(await canSendMagicLink(email))) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: "Too many sign-in links requested. Try again within the hour.", retryable: false } },
        { status: 429, headers: { "retry-after": String(secondsUntilNextWindow()) } },
      );
    }
  }
  return handlers.POST(req);
}
