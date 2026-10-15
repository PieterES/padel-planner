"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUser, isAdmin, requireUser } from "@/lib/auth";
import { commitmentsByKey } from "@/lib/coordination";
import { currentMatches, getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { bookedMessage, readyMessage } from "@/lib/notify";
import { sendPush } from "@/lib/push";

const refresh = () => revalidatePath("/", "layout");

function booking(key: string) {
  return db.select().from(schema.bookings).where(eq(schema.bookings.matchKey, key)).get();
}

/** "I'm in" / "I'm out" for a live match or a booked game. */
export async function toggleIn(key: string): Promise<string | null> {
  const user = await requireUser();
  const where = and(eq(schema.commitments.matchKey, key), eq(schema.commitments.userId, user.id));
  if (db.select().from(schema.commitments).where(where).get()) {
    db.delete(schema.commitments).where(where).run();
    refresh();
    return null;
  }

  const match = currentMatches().find((m) => m.key === key);
  const booked = booking(key);
  if (!match && !booked) return "This match isn’t available anymore.";
  db.insert(schema.commitments).values({ matchKey: key, userId: user.id }).onConflictDoNothing().run();

  // Exactly reached the group's minimum on an unbooked match → tell everyone who's in.
  const players = commitmentsByKey().get(key) ?? [];
  if (match && !booked && players.length === getSettings().minPlayers) {
    await sendPush(
      players.map((p) => p.id),
      readyMessage(match, players.map((p) => p.name)),
    );
  }
  refresh();
  return null;
}

/** Someone booked this slot at Peakz: record it and tell the other players. */
export async function markBooked(key: string): Promise<string | null> {
  const user = await requireUser();
  if (booking(key)) return "Already booked.";
  const match = currentMatches().find((m) => m.key === key);
  if (!match) return "This match isn’t available anymore.";

  db.transaction((tx) => {
    tx.insert(schema.bookings)
      .values({
        matchKey: key,
        locationId: match.locationId,
        locationName: match.locationName,
        startUtc: match.startUtc,
        durationMin: match.durationMin,
        price: match.price,
        bookedBy: user.id,
      })
      .run();
    // The booker is playing, obviously.
    tx.insert(schema.commitments).values({ matchKey: key, userId: user.id }).onConflictDoNothing().run();
  });

  const others = (commitmentsByKey().get(key) ?? []).filter((p) => p.id !== user.id);
  await sendPush(
    others.map((p) => p.id),
    bookedMessage(match, user.name),
  );
  refresh();
  return null;
}

/** Undo a booking (e.g. tapped by mistake, or the booking was cancelled at Peakz). */
export async function undoBooking(key: string): Promise<string | null> {
  const user = await currentUser();
  const b = booking(key);
  if (!b) return null;
  if (!(user && b.bookedBy === user.id) && !(await isAdmin())) return "Only the person who booked can undo this.";
  db.delete(schema.bookings).where(eq(schema.bookings.matchKey, key)).run();
  refresh();
  return null;
}
