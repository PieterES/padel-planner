"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUser, requireCanEdit } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { mondayOf } from "@/lib/time";
import { sendPush } from "@/lib/push";
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

/**
 * Set or change a password. Friends changing their own existing password must
 * give the current one; the admin can set anyone's (e.g. when it's forgotten).
 */
export async function setPassword(
  userId: number,
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  await requireCanEdit(userId);
  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) return "Unknown friend.";
  const self = (await currentUser())?.id === userId;
  if (self && user.passwordHash && !verifyPassword(String(formData.get("current") ?? ""), user.passwordHash)) {
    return "Current password is wrong.";
  }
  const password = String(formData.get("password") ?? "");
  const problem = passwordProblem(password, String(formData.get("confirm") ?? ""));
  if (problem) return problem;
  db.update(schema.users).set({ passwordHash: hashPassword(password) }).where(eq(schema.users.id, userId)).run();
  refresh();
  return "Password saved ✓";
}

/** Store this device's push subscription for the logged-in friend. */
export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const user = await currentUser();
  if (!user) return;
  if (!/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return;
  const row = { endpoint: sub.endpoint, userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth };
  db.insert(schema.pushSubscriptions)
    .values(row)
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: row })
    .run();
}

export async function removePushSubscription(endpoint: string) {
  const user = await currentUser();
  if (!user) return;
  db.delete(schema.pushSubscriptions)
    .where(and(eq(schema.pushSubscriptions.endpoint, endpoint), eq(schema.pushSubscriptions.userId, user.id)))
    .run();
}

/** Send a test notification to the logged-in friend's devices. */
export async function testPush(): Promise<number> {
  const user = await currentUser();
  if (!user) return 0;
  return sendPush([user.id], { title: "Padel Planner 🎾", body: "Notifications are working!", url: "/matches" });
}
