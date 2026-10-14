import { DAY_MIN, addDays, mondayOf, weekdayOf, type Weekday } from "./time";
import type { WeekRanges } from "./week-ranges";

/** Half-open interval [start, end) in minutes since local midnight. */
export interface Interval {
  start: number;
  end: number;
}

/** A friend's default week: one row per available weekday. */
export interface AvailabilityRule {
  userId: number;
  weekday: Weekday;
  startMin: number;
  endMin: number;
}

/** Replaces the default week for one specific week (all 7 days, null = not available). */
export interface WeekOverride {
  userId: number;
  weekStart: string; // Monday, YYYY-MM-DD (Amsterdam)
  ranges: WeekRanges;
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out.at(-1);
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** A user's free time on one local date: the week's override if there is one, else the default week. */
export function freeIntervals(
  rules: AvailabilityRule[],
  overrides: WeekOverride[],
  userId: number,
  date: string,
): Interval[] {
  const weekday = weekdayOf(date);
  const override = overrides.find((o) => o.userId === userId && o.weekStart === mondayOf(date));
  if (override) {
    const r = override.ranges[weekday - 1];
    return r ? [{ start: r.startMin, end: r.endMin }] : [];
  }
  return mergeIntervals(
    rules
      .filter((r) => r.userId === userId && r.weekday === weekday)
      .map((r) => ({ start: r.startMin, end: r.endMin })),
  );
}

/**
 * Is the user free for the whole span starting at `startMin` on `date`?
 * Spans past midnight are checked against the next day as well.
 */
export function isFreeFor(
  rules: AvailabilityRule[],
  overrides: WeekOverride[],
  userId: number,
  date: string,
  startMin: number,
  durationMin: number,
): boolean {
  const covers = (free: Interval[], s: number, e: number) =>
    free.some((i) => i.start <= s && i.end >= e);
  const end = startMin + durationMin;
  const today = freeIntervals(rules, overrides, userId, date);
  if (end <= DAY_MIN) return covers(today, startMin, end);
  const tomorrow = freeIntervals(rules, overrides, userId, addDays(date, 1));
  return covers(today, startMin, DAY_MIN) && covers(tomorrow, 0, end - DAY_MIN);
}
