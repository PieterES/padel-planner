import { eq } from "drizzle-orm";
import { db as defaultDb, schema, type Db } from "./db";
import { findMatches, type Constraints, type MatchGroup, type MatchInput } from "./matching";

export function getSettings(db: Db = defaultDb) {
  const s = db.select().from(schema.settings).where(eq(schema.settings.id, 1)).get();
  if (!s) throw new Error("settings row missing");
  return s;
}

export function getEnabledLocations(db: Db = defaultDb) {
  return db.select().from(schema.locations).where(eq(schema.locations.enabled, true)).all();
}

export function loadMatchInput(db: Db = defaultDb, now = new Date()): MatchInput {
  const s = getSettings(db);
  const constraints: Constraints = {
    locationIds: getEnabledLocations(db).map((l) => l.id),
    indoorOutdoor: s.indoorOutdoor,
    durations: s.durations,
    windows: s.windows,
    minPlayers: s.minPlayers,
  };
  return {
    players: db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).all(),
    rules: db.select().from(schema.availabilityRules).all().map((r) => ({
      ...r,
      weekday: r.weekday as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    })),
    overrides: db.select().from(schema.weekOverrides).all(),
    courts: db.select().from(schema.courts).all(),
    slots: db.select().from(schema.slots).all(),
    constraints,
    now,
  };
}

export function currentMatches(db: Db = defaultDb, now = new Date()): MatchGroup[] {
  return findMatches(loadMatchInput(db, now));
}
