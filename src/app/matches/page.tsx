import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { currentMatches } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { describeWhen, type MatchGroup } from "@/lib/matching";
import { toLocal } from "@/lib/time";
import { MatchCard, toMatchCard } from "../match-card";

export default async function MatchesPage() {
  const user = await requireUser();
  const matches = currentMatches();
  const slugs = new Map(db.select().from(schema.locations).all().map((l) => [l.id, l.slug]));
  const lastRun = db
    .select()
    .from(schema.scrapeRuns)
    .where(eq(schema.scrapeRuns.status, "ok"))
    .orderBy(desc(schema.scrapeRuns.id))
    .get();

  // Chronological, grouped by day.
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
              {ms.map((m) => (
                <MatchCard key={m.key} m={toMatchCard(m, { slugs, viewerId: user.id, withDate: false })} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
