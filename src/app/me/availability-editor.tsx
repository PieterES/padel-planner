import { and, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { addDays, mondayOf, toLocal } from "@/lib/time";
import { rulesToWeekRanges } from "@/lib/week-ranges";
import { Icon } from "../ui";
import { resetWeek } from "./actions";
import { WeeklyHoursForm } from "./weekly-hours-form";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const dayMonth = (date: string) => {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

/**
 * Week selector + 7-day form for one friend. "Default week" edits the
 * repeating pattern; a specific week edits an override for just that week.
 * Used by /me and /admin/friends/[id]; the selected week is the `week` search param.
 */
export function AvailabilityEditor({
  userId,
  basePath,
  week,
}: {
  userId: number;
  basePath: string;
  week: string | undefined;
}) {
  const today = toLocal(new Date()).date;
  const thisMonday = mondayOf(today);
  const lastBookable = addDays(today, getSettings().horizonDays);
  const weeks: string[] = [];
  for (let w = thisMonday; w <= lastBookable; w = addDays(w, 7)) weeks.push(w);

  const selected = week && weeks.includes(week) ? week : null;
  const rules = db
    .select()
    .from(schema.availabilityRules)
    .where(eq(schema.availabilityRules.userId, userId))
    .all();
  const overrides = db
    .select()
    .from(schema.weekOverrides)
    .where(and(eq(schema.weekOverrides.userId, userId), gte(schema.weekOverrides.weekStart, thisMonday)))
    .all();
  const overridden = new Set(overrides.map((o) => o.weekStart));
  const override = selected ? overrides.find((o) => o.weekStart === selected) : undefined;
  const defaultRanges = rulesToWeekRanges(rules);

  const weekLabel = (w: string) =>
    w === thisMonday
      ? "This week"
      : w === addDays(thisMonday, 7)
        ? "Next week"
        : `${dayMonth(w)} – ${dayMonth(addDays(w, 6))}`;
  const pill = (active: boolean) => `pill ${active ? "pill-active" : ""}`;

  return (
    <section className="card">
      <nav className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link href={basePath} className={pill(!selected)}>
          <Icon name="repeat" className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
          Default week
        </Link>
        {weeks.map((w) => (
          <Link key={w} href={`${basePath}?week=${w}`} className={pill(w === selected)}>
            {weekLabel(w)}
            {overridden.has(w) && (
              <>
                <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-lime align-middle ring-1 ring-lime-ink/30" />
                <span className="sr-only"> (changed)</span>
              </>
            )}
          </Link>
        ))}
      </nav>

      {selected ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-display text-base font-semibold">
            {dayMonth(selected)} – {dayMonth(addDays(selected, 6))}
          </span>
          {override ? (
            <span className="chip bg-lime/30 text-lime-ink dark:text-lime">custom for this week</span>
          ) : (
            <span className="chip-muted">following your default week</span>
          )}
          <span className="text-muted">Changes here only apply to this week.</span>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Switch on the days you can usually play and set from when until when. This repeats every
          week, unless you change a specific week above (<span className="inline-block h-2 w-2 rounded-full bg-lime align-middle" /> = changed).
        </p>
      )}

      {/* key: fresh form per friend and per week (and after a reset) */}
      <WeeklyHoursForm
        key={`${userId}:${selected ?? "default"}:${override ? "custom" : "default"}`}
        userId={userId}
        weekStart={selected}
        values={override?.ranges ?? defaultRanges}
        labels={
          selected
            ? DAY_NAMES.map((d, i) => `${d.slice(0, 3)} ${dayMonth(addDays(selected, i))}`)
            : undefined
        }
      />

      {override && (
        <form action={resetWeek.bind(null, userId, selected!)} className="mt-3">
          <button className="btn-ghost">↺ Reset this week to default</button>
        </form>
      )}
    </section>
  );
}
