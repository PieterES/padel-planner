import { randomBytes, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "./db";
import { verifyPassword } from "./password";

export const USER_COOKIE = "pp_user";
export const ADMIN_COOKIE = "pp_admin";
export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export const newMagicToken = () => randomBytes(18).toString("base64url");

export function userByToken(token: string | undefined) {
  if (!token) return undefined;
  return db.select().from(schema.users).where(eq(schema.users.magicToken, token)).get();
}

/** Case-insensitive lookup by display name (names are unique ignoring case). */
export function userByName(name: string) {
  return db
    .select()
    .from(schema.users)
    .where(sql`lower(${schema.users.name}) = lower(${name.trim()})`)
    .get();
}

/** Log this browser in as `magicToken`'s user. */
export async function signIn(magicToken: string) {
  (await cookies()).set(USER_COOKIE, magicToken, COOKIE_OPTS);
}

export async function currentUser() {
  return userByToken((await cookies()).get(USER_COOKIE)?.value);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/");
  return user;
}

export function isAdminToken(token: string | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/**
 * The organiser logs in on the normal login form as "admin". This is not a
 * friend: there's no users row, so it never appears in lists or matches.
 */
export const ADMIN_NAME = "admin";
export const isAdminName = (name: string) => name.trim().toLowerCase() === ADMIN_NAME;

/** Hash set from /admin; until then the password is ADMIN_PASSWORD from the env, or "admin". */
function adminPasswordHash(): string | null {
  return db.select().from(schema.settings).where(eq(schema.settings.id, 1)).get()?.adminPasswordHash ?? null;
}

export function isAdminPassword(password: string): boolean {
  const hash = adminPasswordHash();
  if (hash) return verifyPassword(password, hash);
  const expected = process.env.ADMIN_PASSWORD || "admin";
  if (password.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

/** Still using the built-in "admin" password? (Shown as a warning on /admin.) */
export const adminUsesDefaultPassword = () => !adminPasswordHash() && !process.env.ADMIN_PASSWORD;

/** Give this browser admin access (the cookie holds ADMIN_TOKEN, as /admin/login does). */
export async function signInAdmin() {
  (await cookies()).set(ADMIN_COOKIE, process.env.ADMIN_TOKEN ?? "", COOKIE_OPTS);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  if (isAdminToken(jar.get(ADMIN_COOKIE)?.value)) return true;
  return (await currentUser())?.isAdmin ?? false;
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/");
}

const publicUrl = (path: string) =>
  `${(process.env.PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;

export const magicLink = (token: string) => publicUrl(`/u/${token}`);
export const inviteLink = (token: string) => publicUrl(`/join/${token}`);

/** A friend may edit their own availability; the admin may edit anyone's. */
export async function requireCanEdit(userId: number) {
  const user = await currentUser();
  if (user?.id === userId) return;
  if (await isAdmin()) return;
  redirect("/");
}

/** Pages any friend or the admin may view. Returns the friend, if logged in as one. */
export async function requireViewer() {
  const user = await currentUser();
  if (!user && !(await isAdmin())) redirect("/");
  return user;
}
