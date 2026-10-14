import { eq } from "drizzle-orm";
import { db as defaultDb, schema, type Db } from "../src/lib/db";
import { currentMatches, getEnabledLocations, getSettings, matchDeepLinker } from "../src/lib/data";
import { formatWhatsAppMessage, playersSignature, selectNewMatches } from "../src/lib/matching";
import { fetchAvailability } from "../src/lib/peakz/client";
import { addDays, toLocal } from "../src/lib/time";

export type Trigger = "manual" | "cron" | "cli";

/** Sends one message to the group chat. Returns false if not connected/configured. */
export type Notifier = (text: string) => Promise<boolean>;

export interface PipelineResult {
  runId: number;
  slotCount: number;
  matchCount: number;
  message: string | null;
  posted: boolean;
}

let running: Promise<PipelineResult> | null = null;

/** Scrape Peakz → store slots → compute matches → post new ones. One run at a time. */
export function runPipeline(
  trigger: Trigger,
  notify: Notifier | null,
  db: Db = defaultDb,
): Promise<PipelineResult> {
  running ??= run(trigger, notify, db).finally(() => (running = null));
  return running;
}

export const isRunning = () => running !== null;

async function run(trigger: Trigger, notify: Notifier | null, db: Db): Promise<PipelineResult> {
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
    const posted = new Map(
      db.select().from(schema.postedMatches).all().map((p) => [p.key, p.playersSig]),
    );
    const fresh = selectNewMatches(matches, posted, settings.topNPosted);
    const message = fresh.length
      ? formatWhatsAppMessage(fresh, startedAt, matchDeepLinker(db))
      : null;

    let sent = false;
    if (message && notify) {
      sent = await notify(message);
      if (sent) {
        const postedAt = new Date();
        for (const g of fresh) {
          const row = { key: g.key, playersSig: playersSignature(g), postedAt };
          db.insert(schema.postedMatches)
            .values(row)
            .onConflictDoUpdate({ target: schema.postedMatches.key, set: row })
            .run();
        }
      }
    }

    db.update(schema.scrapeRuns)
      .set({
        status: "ok",
        finishedAt: new Date(),
        slotCount: slots.length,
        matchCount: matches.length,
        postedCount: sent ? fresh.length : 0,
      })
      .where(eq(schema.scrapeRuns.id, runId))
      .run();

    return { runId, slotCount: slots.length, matchCount: matches.length, message, posted: sent };
  } catch (e) {
    db.update(schema.scrapeRuns)
      .set({ status: "error", finishedAt: new Date(), error: String((e as Error).stack ?? e) })
      .where(eq(schema.scrapeRuns.id, runId))
      .run();
    throw e;
  }
}
