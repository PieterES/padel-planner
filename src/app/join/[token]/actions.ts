"use server";

import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COOKIE_OPTS, USER_COOKIE, newMagicToken } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";

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

  const taken = db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`lower(${schema.users.name}) = lower(${name.data})`)
    .get();
  if (taken) return `“${name.data}” is already in the group. Pick another name, or ask the organiser for your link.`;
  if ((await db.$count(schema.users)) >= MAX_USERS) return "The group is full.";

  const magicToken = newMagicToken();
  db.insert(schema.users).values({ name: name.data, magicToken }).run();
  (await cookies()).set(USER_COOKIE, magicToken, COOKIE_OPTS);
  redirect("/me?welcome=1");
}
