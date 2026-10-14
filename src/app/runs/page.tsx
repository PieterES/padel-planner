import { asc, desc, eq } from "drizzle-orm";
import { requireViewer } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { describeWhen } from "@/lib/matching";
import { toMatchCard } from "../match-card";
import { MatchList } from "./match-list";
import { RunPicker } from "./run-picker";

/** Results per scrape run: pick a run, see its best matches. */
export default async function RunsPage({ searchParams }: PageProps<"/runs">) {
  const viewer = await requireViewer();
  const { run } = await searchParams;

  const runs = db
    .select()
    .from(schema.scrapeRuns)
    .where(eq(schema.scrapeRuns.status, "ok"))
    .orderBy(desc(schema.scrapeRuns.id))
    .limit(30)
    .all();
  if (!runs.length) {
    return (
      <div>
        <h1>Runs</h1>
        <p className="card">No runs yet. They happen every night at 00:30, or from Admin.</p>
      </div>
    );
  }

  const selected = runs.find((r) => r.id === Number(run)) ?? runs[0];
  const rows = db
    .select()
    .from(schema.runMatches)
    .where(eq(schema.runMatches.runId, selected.id))
    .orderBy(asc(schema.runMatches.rank))
    .all();
  const slugs = new Map(db.select().from(schema.locations).all().map((l) => [l.id, l.slug]));
  const cards = rows.map((m) =>
    toMatchCard(m, { slugs, viewerId: viewer?.id, rank: m.rank, withDate: true }),
  );

  const label = (r: (typeof runs)[number]) =>
    `${describeWhen(r.startedAt, 0).split("–")[0]} · ${r.matchCount ?? 0} matches${r.trigger === "cron" ? "" : ` (${r.trigger})`}`;

  return (
    <div>
      <h1>Runs</h1>
      <div className="mb-2 flex flex-wrap items-end gap-4">
        <RunPicker runs={runs.map((r) => ({ id: r.id, label: label(r) }))} selected={selected.id} />
      </div>
      <p className="mb-6 text-sm text-muted">
        Best matches from this run: most friends free first, then earliest. Availability as it was
        when the run happened; see Matches for the live view.
      </p>
      {cards.length ? (
        <MatchList matches={cards} />
      ) : (
        <p className="card">
          {selected.matchCount
            ? "This run's matches weren't saved (it ran before this page existed)."
            : "No matches in this run."}
        </p>
      )}
    </div>
  );
}
