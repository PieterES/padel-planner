import { desc, eq, lt } from "drizzle-orm";
import { db as defaultDb, schema, type Db } from "../src/lib/db";
import { currentMatches, getEnabledLocations, getSettings } from "../src/lib/data";
import { fetchAvailability } from "../src/lib/peakz/client";
import { addDays, toLocal } from "../src/lib/time";

export type Trigger = "manual" | "cron" | "cli";

/** Runs whose match snapshots are kept (older snapshots are deleted). */
const KEEP_RUN_SNAPSHOTS = 30;

export interface PipelineResult {
  runId: number;
  slotCount: number;
  matchCount: number;
}

let running: Promise<PipelineResult> | null = null;

/** Scrape Peakz → replace stored slots → snapshot ranked matches. One run at a time. */
export function runPipeline(trigger: Trigger, db: Db = defaultDb): Promise<PipelineResult> {
  running ??= run(trigger, db).finally(() => (running = null));
  return running;
}

export const isRunning = () => running !== null;

async function run(trigger: Trigger, db: Db): Promise<PipelineResult> {
  const startedAt = new Date();
  const runId = db
    .insert(schema.scrapeRuns)
    .values({ trigger, status: "running", startedAt })
    .returning({ id: schema.scrapeRuns.id })
    .get().id;

  try {
    const settings = getSettings(db);
    const locations = getEnabledLocations(db);
    const today = toLocal(startedAt).date;
    const dates = Array.from({ length: settings.horizonDays + 1 }, (_, i) => addDays(today, i));

    const { courts, slots } = await fetchAvailability(locations, dates, {
      onProgress: (done, total) => {
        if (done % 10 === 0 || done === total) console.log(`[scrape] ${done}/${total}`);
      },
    });

    db.transaction((tx) => {
      for (const c of courts) {
        tx.insert(schema.courts).values(c).onConflictDoUpdate({ target: schema.courts.id, set: c }).run();
      }
      tx.delete(schema.slots).run();
      for (let i = 0; i < slots.length; i += 500) {
        tx.insert(schema.slots)
          .values(slots.slice(i, i + 500).map((s) => ({ ...s, runId })))
          .onConflictDoNothing()
          .run();
      }
    });

    const matches = currentMatches(db, startedAt);
    const matchCount = matches.length;
    db.transaction((tx) => {
      const rows = matches.map((m, i) => ({
        runId,
        rank: i + 1,
        locationId: m.locationId,
        locationName: m.locationName,
        startUtc: m.startUtc,
        durationMin: m.durationMin,
        courts: m.courts.map((c) => ({ name: c.name, indoor: c.indoor })),
        players: m.players,
      }));
      for (let i = 0; i < rows.length; i += 200) {
        tx.insert(schema.runMatches).values(rows.slice(i, i + 200)).run();
      }
      tx.update(schema.scrapeRuns)
        .set({ status: "ok", finishedAt: new Date(), slotCount: slots.length, matchCount })
        .where(eq(schema.scrapeRuns.id, runId))
        .run();
      const cutoff = tx
        .select({ id: schema.scrapeRuns.id })
        .from(schema.scrapeRuns)
        .orderBy(desc(schema.scrapeRuns.id))
        .limit(1)
        .offset(KEEP_RUN_SNAPSHOTS - 1)
        .get();
      if (cutoff) tx.delete(schema.runMatches).where(lt(schema.runMatches.runId, cutoff.id)).run();
    });

    return { runId, slotCount: slots.length, matchCount };
  } catch (e) {
    db.update(schema.scrapeRuns)
      .set({ status: "error", finishedAt: new Date(), error: String((e as Error).stack ?? e) })
      .where(eq(schema.scrapeRuns.id, runId))
      .run();
    throw e;
  }
}
