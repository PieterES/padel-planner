import { asc, desc, eq } from "drizzle-orm";
import { requireViewer } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { describeWhen } from "@/lib/matching";
import { toMatchCard } from "../match-card";
import { EmptyState, PageHeader } from "../ui";
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
        <PageHeader eyebrow="History" title="Runs" />
        <EmptyState title="No runs yet">
          Peakz is checked every night at 00:30, or whenever the admin presses “Scrape &amp; match now”.
        </EmptyState>
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
  const groupSize = await db.$count(schema.users);
  const cards = rows.map((m) =>
    toMatchCard(m, { slugs, groupSize, viewerId: viewer?.id, rank: m.rank }),
  );

  const label = (r: (typeof runs)[number]) =>
    `${describeWhen(r.startedAt, 0).split("–")[0]} · ${r.matchCount ?? 0} matches${r.trigger === "cron" ? "" : ` (${r.trigger})`}`;

  return (
    <div>
      <PageHeader
        eyebrow="History"
        title="Best matches per run"
        actions={
          <RunPicker runs={runs.map((r) => ({ id: r.id, label: label(r) }))} selected={selected.id} />
        }
      >
        Ranked by most friends free, then earliest. Availability as it was when the run happened.
        Matches shows the live view.
      </PageHeader>
      {cards.length ? (
        <MatchList matches={cards} />
      ) : (
        <EmptyState title={selected.matchCount ? "Not saved" : "No matches in this run"}>
          {selected.matchCount
            ? "This run happened before results were saved per run."
            : "Not enough friends were free when there were courts available."}
        </EmptyState>
      )}
    </div>
  );
}
