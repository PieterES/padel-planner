import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { isAdmin, requireViewer } from "@/lib/auth";
import {
  commitmentsByKey,
  upcomingBookings,
  type Booking,
} from "@/lib/coordination";
import { currentMatches, getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { describeWhen, type MatchGroup } from "@/lib/matching";
import { addDays, toLocal } from "@/lib/time";
import { MatchCard, toMatchCard } from "../match-card";
import { AvatarStack, EmptyState, PageHeader } from "../ui";
import { BookedActions, MatchActions } from "./match-actions";

export default async function MatchesPage({
  searchParams,
}: PageProps<"/matches">) {
  const user = await requireViewer();
  const admin = await isAdmin();
  const { mine: mineParam, club } = await searchParams;
  const onlyMine = mineParam === "1" && !!user;
  const clubFilter = typeof club === "string" ? club : null;

  const settings = getSettings();
  const committed = commitmentsByKey();
  const bookings = upcomingBookings();
  const bookedKeys = new Set(bookings.map((b) => b.matchKey));
  const locations = db
    .select()
    .from(schema.locations)
    .where(eq(schema.locations.enabled, true))
    .orderBy(asc(schema.locations.name))
    .all();
  const slugs = new Map(
    db
      .select()
      .from(schema.locations)
      .all()
      .map((l) => [l.id, l.slug]),
  );
  const groupSize = await db.$count(schema.users);
  const lastRun = db
    .select()
    .from(schema.scrapeRuns)
    .where(eq(schema.scrapeRuns.status, "ok"))
    .orderBy(desc(schema.scrapeRuns.id))
    .get();

  const all = currentMatches().filter((m) => !bookedKeys.has(m.key));
  const isMine = (m: MatchGroup) =>
    !!user && m.players.some((p) => p.id === user.id);
  const matches = all.filter(
    (m) =>
      (!onlyMine || isMine(m)) && (!clubFilter || m.locationId === clubFilter),
  );

  // Chronological, grouped by day.
  const byDay = new Map<string, MatchGroup[]>();
  for (const m of [...matches].sort(
    (a, b) => a.startUtc.getTime() - b.startUtc.getTime(),
  )) {
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

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const next = { mine: onlyMine ? "1" : null, club: clubFilter, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/matches?${qs}` : "/matches";
  };
  const pill = (active: boolean) => `pill ${active ? "pill-active" : ""}`;

  return (
    <div>
      <PageHeader eyebrow="Live" title="Matches">
        Free courts that fit the group settings while enough of you can play.
        Tap <strong>I’m in</strong>; when there are enough players, someone
        books it on Peakz and taps <strong>I booked it</strong>.
      </PageHeader>

      {bookings.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3">Upcoming games</h2>
          <ul className="space-y-3">
            {bookings.map((b) => (
              <BookedGame
                key={b.id}
                b={b}
                slugs={slugs}
                viewerId={user?.id}
                canUndo={admin || (!!user && b.bookedBy?.id === user.id)}
              />
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 flex flex-col gap-2">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {user && (
            <>
              <Link href={href({ mine: null })} className={pill(!onlyMine)}>
                Everything
              </Link>
              <Link href={href({ mine: "1" })} className={pill(onlyMine)}>
                Only where I’m free
              </Link>
              <span className="mx-1 w-px flex-none bg-line" />
            </>
          )}
          <Link href={href({ club: null })} className={pill(!clubFilter)}>
            All clubs
          </Link>
          {locations.map((l) => (
            <Link
              key={l.id}
              href={href({ club: l.id })}
              className={pill(clubFilter === l.id)}
            >
              {l.name.split(" - ").at(-1)}
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted">
          {matches.length} match{matches.length === 1 ? "" : "es"} · courts
          checked{" "}
          {lastRun?.finishedAt
            ? describeWhen(lastRun.finishedAt, 0).split("–")[0]
            : "never"}
        </p>
      </div>

      {!matches.length ? (
        <EmptyState
          title={
            all.length
              ? "No matches with these filters"
              : "No matches right now"
          }
        >
          {all.length
            ? "Try “Everything” or “All clubs”."
            : "When enough friends are free at the same time as a court, it shows up here."}
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {[...byDay].map(([day, ms]) => (
            <section key={day}>
              <h2 className="sticky top-16 z-10 -mx-1 mb-3 bg-background/90 px-1 py-1 backdrop-blur">
                {dayTitle(day, ms[0])}{" "}
                <span className="text-sm font-normal text-muted">
                  · {ms.length}
                </span>
              </h2>
              <ul className="space-y-3">
                {ms.map((m) => {
                  const card = toMatchCard(m, {
                    slugs,
                    groupSize,
                    viewerId: user?.id,
                  });
                  const inList = committed.get(m.key) ?? [];
                  return (
                    <MatchCard key={m.key} showDate={false} m={card}>
                      <MatchActions
                        matchKey={m.key}
                        inNames={inList.map((p) => p.name)}
                        iAmIn={!!user && inList.some((p) => p.id === user.id)}
                        minPlayers={settings.minPlayers}
                        isFriend={!!user}
                        peakzLink={card.link}
                      />
                    </MatchCard>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function BookedGame({
  b,
  slugs,
  viewerId,
  canUndo,
}: {
  b: Booking;
  slugs: Map<string, string>;
  viewerId: number | undefined;
  canUndo: boolean;
}) {
  const card = toMatchCard(
    { ...b, courts: [], players: b.players },
    { slugs, groupSize: 0, viewerId },
  );
  return (
    <li className="card border-ok/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="grid h-16 w-16 flex-none place-items-center rounded-xl bg-navy text-navy-ink">
            <div className="text-center leading-none">
              <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                {card.dow}
              </div>
              <div className="font-display text-2xl font-bold text-lime">
                {card.day}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                {card.month}
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-xl font-bold tabular-nums">
                {card.time}
              </span>
              <span className="font-medium">{card.venue}</span>
              {card.city && (
                <span className="text-sm text-muted">{card.city}</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
              <span className="chip bg-ok/15 text-ok">
                ✓ Booked{b.bookedBy ? ` by ${b.bookedBy.name}` : ""}
              </span>
              {card.pricePP && (
                <span className="chip-muted">{card.pricePP} p.p.</span>
              )}
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-2"
          title={card.players.join(", ")}
        >
          <AvatarStack names={card.players} max={5} />
          <span className="text-sm text-muted">
            <strong className="text-foreground">{card.players.length}</strong>{" "}
            playing
          </span>
        </div>
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <BookedActions
          matchKey={b.matchKey}
          iAmIn={!!viewerId && b.players.some((p) => p.id === viewerId)}
          isFriend={viewerId !== undefined}
          canUndo={canUndo}
          icsHref={`/bookings/${b.id}/ics`}
        />
      </div>
    </li>
  );
}
