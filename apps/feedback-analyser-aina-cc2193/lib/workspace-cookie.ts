// Shared by proxy.ts and the server helpers: no DB or Next server imports here.
export const WORKSPACE_COOKIE = "fa_workspace";
export const WORKSPACE_COOKIE_MAX_AGE = 400 * 24 * 3600; // browser cap for cookie lifetime

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isWorkspaceId = (v: string | undefined | null): v is string => !!v && UUID_RE.test(v);
