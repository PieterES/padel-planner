import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export { schema };

const DB_PATH = process.env.DATABASE_PATH ?? join(process.cwd(), "data", "app.db");

function open() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  // web and worker share this file.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  const runMigrations = () => migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
  try {
    runMigrations();
  } catch {
    // web and worker may start together; the loser sees the winner's tables.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
    runMigrations();
  }
  seed(db);
  return db;
}

export type Db = ReturnType<typeof open>;

const evening = { startMin: 18 * 60, endMin: 23 * 60 };
const weekend = { startMin: 9 * 60, endMin: 22 * 60 };

function seed(db: Db) {
  db.insert(schema.settings)
    .values({
      id: 1,
      indoorOutdoor: "any",
      durations: [90],
      windows: [evening, evening, evening, evening, evening, weekend, weekend],
      minPlayers: 4,
      horizonDays: 28,
      topNPosted: 5,
    })
    .onConflictDoNothing()
    .run();
  db.insert(schema.locations)
    .values([
      { id: "f37fb2ae-bf24-44f1-9b81-61e6c0784840", slug: "zeehaenkade", name: "Utrecht - Zeehaenkade" },
      { id: "d73eb5b8-ed34-45ef-bec3-52a4f79aa3a3", slug: "kauwgomballenkwartier", name: "Amsterdam - Kauwgomballenkwartier" },
      { id: "7f9c8bf2-ea21-49b9-8065-7e0d3db07ff1", slug: "olympiaplein", name: "Amsterdam - Olympiaplein" },
    ])
    .onConflictDoNothing()
    .run();
}

// Opened lazily (not at import, so `next build` never touches the DB) and
// reused across Next.js hot reloads.
const g = globalThis as unknown as { __padelDb?: Db };
const instance = () => (g.__padelDb ??= open());

export const db = new Proxy({} as Db, {
  get(_, prop) {
    const real = instance();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
