import { DAY_MIN, addDays, weekdayOf, type Weekday } from "./time";

/** Half-open interval [start, end) in minutes since local midnight. */
export interface Interval {
  start: number;
  end: number;
}

export interface AvailabilityRule {
  userId: number;
  weekday: Weekday;
  startMin: number;
  endMin: number;
}

export interface AvailabilityException {
  userId: number;
  date: string; // YYYY-MM-DD (Amsterdam)
  /** null start/end means the whole day. */
  startMin: number | null;
  endMin: number | null;
  kind: "available" | "unavailable";
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

export function subtractInterval(intervals: Interval[], cut: Interval): Interval[] {
  return intervals.flatMap((i) => {
    if (cut.end <= i.start || cut.start >= i.end) return [i];
    const parts: Interval[] = [];
    if (cut.start > i.start) parts.push({ start: i.start, end: cut.start });
    if (cut.end < i.end) parts.push({ start: cut.end, end: i.end });
    return parts;
  });
}

function exceptionInterval(e: AvailabilityException): Interval {
  return { start: e.startMin ?? 0, end: e.endMin ?? DAY_MIN };
}

/**
 * A user's free time on one local date: weekly rules, plus "available"
 * exceptions, minus "unavailable" exceptions (unavailable wins on overlap).
 */
export function freeIntervals(
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[],
  userId: number,
  date: string,
): Interval[] {
  const weekday = weekdayOf(date);
  const todays = exceptions.filter((e) => e.userId === userId && e.date === date);
  let free = mergeIntervals([
    ...rules
      .filter((r) => r.userId === userId && r.weekday === weekday)
      .map((r) => ({ start: r.startMin, end: r.endMin })),
    ...todays.filter((e) => e.kind === "available").map(exceptionInterval),
  ]);
  for (const e of todays.filter((e) => e.kind === "unavailable")) {
    free = subtractInterval(free, exceptionInterval(e));
  }
  return free;
}

/**
 * Is the user free for the whole span starting at `startMin` on `date`?
 * Spans past midnight are checked against the next day as well.
 */
export function isFreeFor(
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[],
  userId: number,
  date: string,
  startMin: number,
  durationMin: number,
): boolean {
  const covers = (free: Interval[], s: number, e: number) =>
    free.some((i) => i.start <= s && i.end >= e);
  const end = startMin + durationMin;
  const today = freeIntervals(rules, exceptions, userId, date);
  if (end <= DAY_MIN) return covers(today, startMin, end);
  const tomorrow = freeIntervals(rules, exceptions, userId, addDays(date, 1));
  return covers(today, startMin, DAY_MIN) && covers(tomorrow, 0, end - DAY_MIN);
}
