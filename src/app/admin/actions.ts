"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminName, isAdminPassword, newMagicToken, requireAdmin, userByName } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/password";

const done = () => revalidatePath("/admin");

export async function addUser(formData: FormData) {
  await requireAdmin();
  const name = z.string().trim().min(1).max(40).parse(formData.get("name"));
  if (userByName(name) || isAdminName(name)) return; // names are logins: unique, "admin" reserved
  db.insert(schema.users).values({ name, magicToken: newMagicToken() }).run();
  done();
}

export async function deleteUser(id: number) {
  await requireAdmin();
  db.delete(schema.users).where(eq(schema.users.id, id)).run();
  done();
}

export async function regenerateLink(id: number) {
  await requireAdmin();
  db.update(schema.users).set({ magicToken: newMagicToken() }).where(eq(schema.users.id, id)).run();
  done();
}

/** New invite link (the old one stops working), or null to close sign-ups. */
export async function setInvite(open: boolean) {
  await requireAdmin();
  db.update(schema.settings)
    .set({ inviteToken: open ? newMagicToken() : null })
    .where(eq(schema.settings.id, 1))
    .run();
  done();
}

/** Change the organiser ("admin") login password. */
export async function setAdminPassword(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireAdmin();
  if (!isAdminPassword(String(formData.get("current") ?? ""))) return "Current password is wrong.";
  const password = String(formData.get("password") ?? "");
  const problem = passwordProblem(password, String(formData.get("confirm") ?? ""));
  if (problem) return problem;
  db.update(schema.settings).set({ adminPasswordHash: hashPassword(password) }).where(eq(schema.settings.id, 1)).run();
  done();
  return "Password saved ✓";
}
