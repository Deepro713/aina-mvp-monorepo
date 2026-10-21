import { getConnectionRow, toConnectionDto } from "@/lib/connection";
import { getWorkspaceUser } from "@/lib/workspace";

/** For server components / layouts: null only if the workspace cookie is missing. */
export async function getSessionUser(): Promise<{ id: string; email: string } | null> {
  return getWorkspaceUser();
}

/** For the (app) layout: decide between /connect or render. */
export async function getAppContext() {
  const user = await getSessionUser();
  if (!user) return { user: null, connection: null } as const;
  const row = await getConnectionRow(user.id);
  return { user, connection: row ? toConnectionDto(row) : null } as const;
}
