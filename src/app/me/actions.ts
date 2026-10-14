"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireCanEdit } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { mondayOf } from "@/lib/time";
import { parseWeekRanges } from "@/lib/week-ranges";

// Availability pages: /me and /admin/friends/[id].
const refresh = () => revalidatePath("/", "layout");

function assertMonday(weekStart: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || mondayOf(weekStart) !== weekStart) {
    throw new Error(`not a Monday: ${weekStart}`);
  }
}

/**
 * Saves the week form (fields from WeekRangesFields, prefix "av"):
 * weekStart = null → the default week; a Monday → an override for that week only.
 */
export async function saveWeek(
  userId: number,
  weekStart: string | null,
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  await requireCanEdit(userId);
  const ranges = parseWeekRanges(formData, "av");

  if (weekStart === null) {
    const rules = ranges.flatMap((r, i) =>
      r ? [{ userId, weekday: i + 1, startMin: r.startMin, endMin: r.endMin }] : [],
    );
    db.transaction((tx) => {
      tx.delete(schema.availabilityRules).where(eq(schema.availabilityRules.userId, userId)).run();
      if (rules.length) tx.insert(schema.availabilityRules).values(rules).run();
    });
  } else {
    assertMonday(weekStart);
    db.insert(schema.weekOverrides)
      .values({ userId, weekStart, ranges })
      .onConflictDoUpdate({
        target: [schema.weekOverrides.userId, schema.weekOverrides.weekStart],
        set: { ranges },
      })
      .run();
  }
  refresh();
  return "Saved ✓";
}

/** Drop a week's override so it follows the default week again. */
export async function resetWeek(userId: number, weekStart: string) {
  await requireCanEdit(userId);
  db.delete(schema.weekOverrides)
    .where(and(eq(schema.weekOverrides.userId, userId), eq(schema.weekOverrides.weekStart, weekStart)))
    .run();
  refresh();
}
