import { and, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { addDays, mondayOf, toLocal } from "@/lib/time";
import { rulesToWeekRanges } from "@/lib/week-ranges";
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
  const pill = (active: boolean) =>
    `rounded-full border border-line px-3 py-1 text-sm no-underline ${active ? "bg-accent text-background" : ""}`;

  return (
    <section>
      <nav className="mb-4 flex flex-wrap gap-2">
        <Link href={basePath} className={pill(!selected)}>
          Default week
        </Link>
        {weeks.map((w) => (
          <Link key={w} href={`${basePath}?week=${w}`} className={pill(w === selected)}>
            {weekLabel(w)}
            {overridden.has(w) && " •"}
          </Link>
        ))}
      </nav>

      {selected ? (
        <p className="mb-4 text-sm text-muted">
          {dayMonth(selected)} – {dayMonth(addDays(selected, 6))}:{" "}
          {override ? (
            <strong className="text-foreground">custom for this week</strong>
          ) : (
            "following your default week"
          )}
          . Changes here only apply to this week.
        </p>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Tick the days you can usually play and from what time until when. This repeats every
          week, unless you change a specific week above (• = changed).
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
          <button className="btn-ghost">Reset this week to default</button>
        </form>
      )}
    </section>
  );
}
