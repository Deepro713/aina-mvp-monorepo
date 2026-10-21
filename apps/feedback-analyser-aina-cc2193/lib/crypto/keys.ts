import {
  createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual,
} from "node:crypto";
import { config } from "@/lib/env";

export class KeyConfigError extends Error {
  constructor(message: string) { super(message); this.name = "KeyConfigError"; }
}

// Current version reads KEY_ENCRYPTION_SECRET; older versions read KEY_ENCRYPTION_SECRET_V<n> during rotation.
function secretFor(version: number): Buffer {
  const raw = version === config.keyEncryptionVersion
    ? process.env.KEY_ENCRYPTION_SECRET
    : process.env[`KEY_ENCRYPTION_SECRET_V${version}`];
  if (!raw) throw new KeyConfigError(`No encryption secret for key_version ${version}`);
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new KeyConfigError("KEY_ENCRYPTION_SECRET must be base64 of exactly 32 bytes");
  return key;
}

// AAD = userId binds a ciphertext to its owner; copying it to another row fails to decrypt.
export function encryptApiKey(plain: string, userId: string): { ciphertext: string; version: number } {
  const version = config.keyEncryptionVersion;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretFor(version), iv);
  cipher.setAAD(Buffer.from(userId, "utf8"));
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { ciphertext: [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64")).join(":"), version };
}

export function decryptApiKey(stored: string, version: number, userId: string): string {
  const [iv, tag, ct] = stored.split(":").map((p) => Buffer.from(p, "base64"));
  if (!iv || !tag || !ct) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", secretFor(version), iv);
  decipher.setAAD(Buffer.from(userId, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export const lastFour = (key: string): string | null => (key.length >= 8 ? key.slice(-4) : null);

// ── Test tokens: prove a /test succeeded for exactly these credentials ──
const TEST_TOKEN_TTL_MS = 15 * 60_000;

export function connectionFingerprint(c: {
  provider: string; modelId: string; baseUrl: string | null; apiKey: string | null;
}): string {
  return createHash("sha256")
    .update([c.provider, c.modelId, c.baseUrl ?? "", c.apiKey ?? ""].join("\u0000"))
    .digest("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", secretFor(config.keyEncryptionVersion))
    .update(`connection-test:${data}`).digest("base64url");
}

export function issueTestToken(userId: string, fingerprint: string): string {
  const ts = Date.now();
  return `${ts}.${sign(`${userId}.${fingerprint}.${ts}`)}`;
}

export function verifyTestToken(token: string, userId: string, fingerprint: string): boolean {
  const [tsRaw, mac] = token.split(".");
  const ts = Number(tsRaw);
  if (!mac || !Number.isFinite(ts) || Date.now() - ts > TEST_TOKEN_TTL_MS) return false;
  const expected = Buffer.from(sign(`${userId}.${fingerprint}.${ts}`));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
