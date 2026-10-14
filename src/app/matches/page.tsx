import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { currentMatches } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { describeWhen, type MatchGroup } from "@/lib/matching";
import { addDays, toLocal } from "@/lib/time";
import { MatchCard, toMatchCard } from "../match-card";
import { EmptyState, PageHeader } from "../ui";

export default async function MatchesPage() {
  const user = await requireUser();
  const matches = currentMatches();
  const slugs = new Map(db.select().from(schema.locations).all().map((l) => [l.id, l.slug]));
  const groupSize = await db.$count(schema.users);
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
  const today = toLocal(new Date()).date;
  const dayTitle = (day: string, first: MatchGroup) =>
    day === today
      ? "Today"
      : day === addDays(today, 1)
        ? "Tomorrow"
        : describeWhen(first.startUtc, 0).split(" ").slice(0, 3).join(" ");
  const mine = matches.filter((m) => m.players.some((p) => p.id === user.id)).length;

  return (
    <div>
      <PageHeader eyebrow="Live" title="Matches">
        Free courts that fit the group settings while enough of you can play. Updated as soon as
        anyone changes their availability.
      </PageHeader>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="matches" value={matches.length} />
        <Stat label="you can join" value={mine} />
        <Stat
          label="courts checked"
          value={lastRun?.finishedAt ? describeWhen(lastRun.finishedAt, 0).split(" ").slice(0, 3).join(" ") : "never"}
          small
        />
      </div>

      {!matches.length ? (
        <EmptyState title="No matches right now">
          When at least the minimum number of friends are free at the same time as a court, it shows
          up here.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {[...byDay].map(([day, ms]) => (
            <section key={day}>
              <h2 className="sticky top-16 z-10 -mx-1 mb-3 bg-background/90 px-1 py-1 backdrop-blur">
                {dayTitle(day, ms[0])}{" "}
                <span className="text-sm font-normal text-muted">· {ms.length}</span>
              </h2>
              <ul className="space-y-3">
                {ms.map((m) => (
                  <MatchCard
                    key={m.key}
                    showDate={false}
                    m={toMatchCard(m, { slugs, groupSize, viewerId: user.id })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="card !p-4">
      <div className={`font-display font-bold ${small ? "text-base sm:text-lg" : "text-2xl sm:text-3xl"}`}>
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
