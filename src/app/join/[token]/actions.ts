"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdminName, newMagicToken, signIn, userByName } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/password";

const MAX_USERS = 30; // a leaked invite link can't flood the group

export async function join(
  inviteToken: string,
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const invite = getSettings().inviteToken;
  if (!invite || invite !== inviteToken) return "This invite link is no longer valid.";

  const name = z.string().trim().min(1).max(40).safeParse(formData.get("name"));
  if (!name.success) return "Please enter your name.";

  const password = String(formData.get("password") ?? "");
  const problem = passwordProblem(password, String(formData.get("confirm") ?? ""));
  if (problem) return problem;

  if (isAdminName(name.data)) return "That name is reserved. Pick another one.";
  if (userByName(name.data)) {
    return `“${name.data}” is already in the group. Log in on the home page, or pick another name.`;
  }
  if ((await db.$count(schema.users)) >= MAX_USERS) return "The group is full.";

  const magicToken = newMagicToken();
  db.insert(schema.users)
    .values({ name: name.data, magicToken, passwordHash: hashPassword(password) })
    .run();
  await signIn(magicToken);
  redirect("/me?welcome=1");
}
