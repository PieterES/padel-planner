import { asc, gt } from "drizzle-orm";
import { db as defaultDb, schema, type Db } from "./db";

export interface Booking {
  id: number;
  matchKey: string;
  locationId: string;
  locationName: string;
  startUtc: Date;
  durationMin: number;
  price: number | null;
  bookedBy: { id: number; name: string } | null;
  players: { id: number; name: string }[];
}

/** match key → friends who said "I'm in" (in the order they joined). */
export function commitmentsByKey(db: Db = defaultDb): Map<string, { id: number; name: string }[]> {
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));
  const out = new Map<string, { id: number; name: string }[]>();
  for (const c of db.select().from(schema.commitments).orderBy(asc(schema.commitments.createdAt)).all()) {
    const name = names.get(c.userId);
    if (name) out.set(c.matchKey, [...(out.get(c.matchKey) ?? []), { id: c.userId, name }]);
  }
  return out;
}

/** Booked games that haven't started yet, soonest first. */
export function upcomingBookings(db: Db = defaultDb, now = new Date()): Booking[] {
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));
  const committed = commitmentsByKey(db);
  return db
    .select()
    .from(schema.bookings)
    .where(gt(schema.bookings.startUtc, now))
    .orderBy(asc(schema.bookings.startUtc))
    .all()
    .map((b) => ({
      ...b,
      bookedBy: b.bookedBy !== null && names.has(b.bookedBy) ? { id: b.bookedBy, name: names.get(b.bookedBy)! } : null,
      players: committed.get(b.matchKey) ?? [],
    }));
}
