import { NextResponse, type NextRequest } from "next/server";
import { isWorkspaceId, WORKSPACE_COOKIE, WORKSPACE_COOKIE_MAX_AGE } from "@/lib/workspace-cookie";

// Issues the anonymous workspace cookie on first visit, and forwards it on the same request
// so server components and API routes can use it immediately.
export function proxy(req: NextRequest) {
  if (isWorkspaceId(req.cookies.get(WORKSPACE_COOKIE)?.value)) return NextResponse.next();
  const id = crypto.randomUUID();
  req.cookies.set(WORKSPACE_COOKIE, id);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(WORKSPACE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WORKSPACE_COOKIE_MAX_AGE,
  });
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/analyze/:path*", "/connect/:path*", "/account/:path*", "/api/:path*"],
};
