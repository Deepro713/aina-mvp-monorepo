import { auth } from "@/auth";
import { getConnectionRow, toConnectionDto } from "@/lib/connection";

/** For server components / layouts: null when signed out. */
export async function getSessionUser(): Promise<{ id: string; email: string } | null> {
  const session = await auth();
  const id = session?.user?.id;
  return id ? { id, email: session.user?.email ?? "" } : null;
}

/** For the (app) layout: decide between /signin, /connect, or render. */
export async function getAppContext() {
  const user = await getSessionUser();
  if (!user) return { user: null, connection: null } as const;
  const row = await getConnectionRow(user.id);
  return { user, connection: row ? toConnectionDto(row) : null } as const;
}
