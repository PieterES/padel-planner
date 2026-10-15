import { sql } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { TimeWindow } from "../matching";

const createdAt = () =>
  integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  /** Session token: the login cookie's value (also usable as a /u/<token> recovery link). */
  magicToken: text("magic_token").notNull().unique(),
  /** scrypt hash (see src/lib/password.ts); null until the friend sets a password. */
  passwordHash: text("password_hash"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const availabilityRules = sqliteTable("availability_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(), // 1 = Monday … 7 = Sunday (default week)
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull(),
});

/** Replaces a friend's default week for one specific week. */
export const weekOverrides = sqliteTable(
  "week_overrides",
  {
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    weekStart: text("week_start").notNull(), // Monday, YYYY-MM-DD (Amsterdam)
    ranges: text("ranges", { mode: "json" }).$type<(TimeWindow | null)[]>().notNull(), // 7 days
  },
  (t) => [primaryKey({ columns: [t.userId, t.weekStart] })],
);

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

/** Snapshot of each run's matches, ranked (players desc, then time). */
export const runMatches = sqliteTable("run_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: integer("run_id").notNull().references(() => scrapeRuns.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(), // 1 = best
  locationId: text("location_id").notNull(),
  locationName: text("location_name").notNull(),
  startUtc: integer("start_utc", { mode: "timestamp" }).notNull(),
  durationMin: integer("duration_min").notNull(),
  courts: text("courts", { mode: "json" }).$type<{ name: string; indoor: boolean | null }[]>().notNull(),
  players: text("players", { mode: "json" }).$type<{ id: number; name: string }[]>().notNull(),
  price: real("price"),
});

/** "I'm in": a friend commits to a match (key = matchKey(location, start, duration)). */
export const commitments = sqliteTable(
  "commitments",
  {
    matchKey: text("match_key").notNull(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.matchKey, t.userId] })],
);

/** A match someone booked at Peakz. Players = its commitments. */
export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchKey: text("match_key").notNull().unique(),
  locationId: text("location_id").notNull(),
  locationName: text("location_name").notNull(),
  startUtc: integer("start_utc", { mode: "timestamp" }).notNull(),
  durationMin: integer("duration_min").notNull(),
  price: real("price"),
  bookedBy: integer("booked_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/** Web push endpoints (one per device/browser that enabled notifications). */
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: createdAt(),
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
  /** Organiser login ("admin") password hash; null = ADMIN_PASSWORD env or "admin". */
  adminPasswordHash: text("admin_password_hash"),
  /** VAPID keys for web push, generated on first use. */
  vapidPublicKey: text("vapid_public_key"),
  vapidPrivateKey: text("vapid_private_key"),
});
