type SessionUser = { id: string; email: string };
let current: { user: SessionUser; expires: string } | null = null;

export function setSession(user: SessionUser | null): void {
  current = user ? { user, expires: new Date(Date.now() + 86_400_000).toISOString() } : null;
}

export const getSession = () => current;
