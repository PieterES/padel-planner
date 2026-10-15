"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { parseWeekRanges } from "@/lib/week-ranges";
import { triggerRun } from "@/lib/worker-client";

// Group settings and "scrape now": open to every friend (and the admin).

export async function saveSettings(formData: FormData) {
  await requireViewer();
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
  revalidatePath("/", "layout");
}

export async function scrapeNow() {
  await requireViewer();
  await triggerRun();
  revalidatePath("/settings");
}
