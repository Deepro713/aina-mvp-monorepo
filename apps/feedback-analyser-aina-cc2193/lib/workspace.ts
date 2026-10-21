import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { isWorkspaceId, WORKSPACE_COOKIE } from "@/lib/workspace-cookie";

export type WorkspaceUser = { id: string; email: string };

/**
 * No sign-in: each browser gets an anonymous workspace via the cookie that proxy.ts issues.
 * The users row is created on first use so every per-user table keeps working unchanged.
 */
export async function getWorkspaceUser(): Promise<WorkspaceUser | null> {
  const id = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  if (!isWorkspaceId(id)) return null;
  const email = `${id}@guest.invalid`; // placeholder: users.email is NOT NULL UNIQUE
  await getDb().insert(users).values({ id, email }).onConflictDoNothing({ target: users.id });
  return { id, email };
}
