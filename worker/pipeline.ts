import { eq } from "drizzle-orm";
import { db as defaultDb, schema, type Db } from "../src/lib/db";
import { currentMatches, getEnabledLocations, getSettings } from "../src/lib/data";
import { fetchAvailability } from "../src/lib/peakz/client";
import { addDays, toLocal } from "../src/lib/time";

export type Trigger = "manual" | "cron" | "cli";

export interface PipelineResult {
  runId: number;
  slotCount: number;
  matchCount: number;
}

let running: Promise<PipelineResult> | null = null;

/** Scrape Peakz → replace stored slots → count matches. One run at a time. */
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

    const matchCount = currentMatches(db, startedAt).length;
    db.update(schema.scrapeRuns)
      .set({ status: "ok", finishedAt: new Date(), slotCount: slots.length, matchCount })
      .where(eq(schema.scrapeRuns.id, runId))
      .run();

    return { runId, slotCount: slots.length, matchCount };
  } catch (e) {
    db.update(schema.scrapeRuns)
      .set({ status: "error", finishedAt: new Date(), error: String((e as Error).stack ?? e) })
      .where(eq(schema.scrapeRuns.id, runId))
      .run();
    throw e;
  }
}
