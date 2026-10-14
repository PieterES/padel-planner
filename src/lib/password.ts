import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const MIN_PASSWORD_LENGTH = 6;
const KEY_LENGTH = 64;

/** "scrypt$<salt hex>$<hash hex>" */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  const [scheme, saltHex, hashHex] = stored?.split("$") ?? [];
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Error message for a password that's not acceptable, else null. */
export function passwordProblem(password: string, confirm?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) return "Password is too long.";
  if (confirm !== undefined && password !== confirm) return "The passwords don’t match.";
  return null;
}

/**
 * In-memory brute-force brake per login name: after 5 wrong passwords,
 * wait a minute. Resets on success or process restart.
 */
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 5;
const LOCK_MS = 60_000;

export function loginLocked(name: string, now = Date.now()): boolean {
  const f = failures.get(name.toLowerCase());
  return !!f && f.count >= MAX_FAILURES && f.until > now;
}

export function recordLoginFailure(name: string, now = Date.now()) {
  const key = name.toLowerCase();
  const f = failures.get(key);
  const count = f && f.until > now ? f.count + 1 : 1;
  failures.set(key, { count, until: now + LOCK_MS });
}

export function clearLoginFailures(name: string) {
  failures.delete(name.toLowerCase());
}
