"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { newMagicToken, requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { parseWeekRanges } from "@/lib/week-ranges";
import { triggerRun } from "@/lib/worker-client";

const done = () => revalidatePath("/admin");

export async function addUser(formData: FormData) {
  await requireAdmin();
  const name = z.string().trim().min(1).max(40).parse(formData.get("name"));
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

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const enabled = new Set(formData.getAll("location"));
  for (const loc of db.select().from(schema.locations).all()) {
    db.update(schema.locations)
      .set({ enabled: enabled.has(loc.id) })
      .where(eq(schema.locations.id, loc.id))
      .run();
  }
  const windows = parseWeekRanges(formData, "win");
  db.update(schema.settings)
    .set({
      indoorOutdoor: z.enum(["indoor", "outdoor", "any"]).parse(formData.get("indoorOutdoor")),
      durations: formData.getAll("duration").map(Number).filter((d) => [60, 90, 120].includes(d)),
      windows,
      minPlayers: z.coerce.number().int().min(2).max(8).parse(formData.get("minPlayers")),
    })
    .where(eq(schema.settings.id, 1))
    .run();
  done();
  revalidatePath("/matches");
}

export async function scrapeNow() {
  await requireAdmin();
  await triggerRun();
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
