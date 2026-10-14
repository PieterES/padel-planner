import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { currentMatches, matchDeepLinker } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { describeWhen, type MatchGroup } from "@/lib/matching";
import { toLocal } from "@/lib/time";

export default async function MatchesPage() {
  const user = await requireUser();
  const matches = currentMatches();
  const link = matchDeepLinker();
  const lastRun = db
    .select()
    .from(schema.scrapeRuns)
    .where(eq(schema.scrapeRuns.status, "ok"))
    .orderBy(desc(schema.scrapeRuns.id))
    .get();

  // Chronological, grouped by day; ranking matters for WhatsApp, not here.
  const byDay = new Map<string, MatchGroup[]>();
  for (const m of [...matches].sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime())) {
    const day = toLocal(m.startUtc).date;
    byDay.set(day, [...(byDay.get(day) ?? []), m]);
  }

  return (
    <div>
      <h1>Matches</h1>
      <p className="mb-6 text-sm text-muted">
        {lastRun?.finishedAt
          ? `Court availability from ${describeWhen(lastRun.finishedAt, 0).split("–")[0]}. `
          : "No scrape has run yet. "}
        A match is a free court that fits the group settings while enough of you are free.
      </p>
      {!matches.length && <p className="card">No matches right now.</p>}
      <div className="space-y-6">
        {[...byDay].map(([day, ms]) => (
          <section key={day}>
            <h2>{describeWhen(ms[0].startUtc, 0).split(" ").slice(0, 3).join(" ")}</h2>
            <ul className="space-y-2">
              {ms.map((m) => {
                const mine = m.players.some((p) => p.id === user.id);
                return (
                  <li key={m.key} className={`card ${mine ? "" : "opacity-60"}`}>
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-semibold">
                        {describeWhen(m.startUtc, m.durationMin).split(" ").slice(3).join(" ")}
                      </span>
                      <span>{m.locationName}</span>
                      <span className="text-sm text-muted">
                        {m.courts.length} court{m.courts.length === 1 ? "" : "s"} free (
                        {[...new Set(m.courts.map((c) => (c.indoor ? "indoor" : "outdoor")))].join(
                          " / ",
                        )}
                        )
                      </span>
                      <a className="ml-auto text-sm" href={link(m)} target="_blank" rel="noreferrer">
                        Book at Peakz →
                      </a>
                    </div>
                    <p className="mt-1 text-sm">
                      <span className="text-muted">{m.players.length} free: </span>
                      {m.players.map((p) => p.name).join(", ")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
