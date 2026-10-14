import { sql } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { TimeWindow } from "../matching";

const createdAt = () =>
  integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  magicToken: text("magic_token").notNull().unique(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const availabilityRules = sqliteTable("availability_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(), // 1 = Monday … 7 = Sunday
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull(),
});

export const availabilityExceptions = sqliteTable("availability_exceptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD, Amsterdam
  startMin: integer("start_min"), // null = whole day
  endMin: integer("end_min"),
  kind: text("kind", { enum: ["available", "unavailable"] }).notNull(),
});

/** Peakz clubs the group may play at. */
export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(), // Foys uuid
  slug: text("slug").notNull(), // peakzpadel.nl deep-link slug
  name: text("name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const courts = sqliteTable("courts", {
  id: text("id").primaryKey(), // Foys inventory item id
  locationId: text("location_id").notNull().references(() => locations.id),
  locationName: text("location_name").notNull(),
  name: text("name").notNull(),
  indoor: integer("indoor", { mode: "boolean" }),
  kind: text("kind", { enum: ["double", "single"] }),
});

/** Available slots from the most recent successful scrape (replaced each run). */
export const slots = sqliteTable(
  "slots",
  {
    courtId: text("court_id").notNull().references(() => courts.id),
    startUtc: integer("start_utc", { mode: "timestamp" }).notNull(),
    durationMin: integer("duration_min").notNull(),
    price: real("price"),
    runId: integer("run_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.courtId, t.startUtc, t.durationMin] })],
);

export const scrapeRuns = sqliteTable("scrape_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trigger: text("trigger", { enum: ["manual", "cron", "cli"] }).notNull(),
  status: text("status", { enum: ["running", "ok", "error"] }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  slotCount: integer("slot_count"),
  matchCount: integer("match_count"),
  error: text("error"),
});

/** Singleton row (id = 1) with the group-wide constraints. */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  indoorOutdoor: text("indoor_outdoor", { enum: ["indoor", "outdoor", "any"] }).notNull(),
  durations: text("durations", { mode: "json" }).$type<number[]>().notNull(),
  windows: text("windows", { mode: "json" }).$type<(TimeWindow | null)[]>().notNull(),
  minPlayers: integer("min_players").notNull(),
  horizonDays: integer("horizon_days").notNull(),
  /** Secret for the /join/<token> self-signup link; null = sign-ups closed. */
  inviteToken: text("invite_token"),
});
