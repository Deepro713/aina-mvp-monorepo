export type LogFields = Record<string, unknown>;

// Structured JSON lines for Vercel Logs. Never pass raw feedback text or keys here.
export function log(level: "info" | "warn" | "error", fields: LogFields): void {
  const line = JSON.stringify({ level, ts: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}
