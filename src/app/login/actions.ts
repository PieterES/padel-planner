"use server";

import { redirect } from "next/navigation";
import { signIn, userByName } from "@/lib/auth";
import {
  clearLoginFailures,
  loginLocked,
  recordLoginFailure,
  verifyPassword,
} from "@/lib/password";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || !password) return "Enter your name and password.";
  if (loginLocked(name)) return "Too many wrong attempts. Wait a minute and try again.";

  const user = userByName(name);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    recordLoginFailure(name);
    return user && !user.passwordHash
      ? "This account has no password yet. Open your personal link once and set one under My week, or ask the organiser."
      : "Name or password is wrong.";
  }
  clearLoginFailures(name);
  await signIn(user.magicToken);
  redirect("/matches");
}
