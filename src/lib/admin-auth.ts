/**
 * Simple admin authentication using a signed cookie.
 * No external dependencies — uses Node.js crypto.
 *
 * The admin password is set in .env as ADMIN_PASSWORD.
 * On login, a signed session token is created and set as an httpOnly cookie.
 * Each admin API request verifies the token.
 */
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "rohi-admin-session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || "fallback-not-secure";
}

/** Create a signed session token (payload.signature) */
export function createSessionToken(): string {
  const payload = JSON.stringify({
    exp: Date.now() + SESSION_DURATION_MS,
  });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

/** Verify a session token. Returns true if valid + not expired. */
export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, signature] = parts;

  // Verify signature
  const expectedSignature = createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  // Check expiry
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (typeof payload.exp !== "number") return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

/** Check if the admin password is configured */
export function isAdminConfigured(): boolean {
  return !!(process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET);
}

/** Verify a password attempt against the configured admin password */
export function verifyPassword(password: string): boolean {
  const configured = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET;
  if (!configured) return false;
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(configured);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export { COOKIE_NAME, SESSION_DURATION_MS };
