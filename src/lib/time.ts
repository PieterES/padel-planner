import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const TZ = "Europe/Amsterdam";
export const DAY_MIN = 24 * 60;

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A UTC instant expressed in Amsterdam wall-clock terms. */
export interface LocalTime {
  date: string; // YYYY-MM-DD
  minutes: number; // minutes since local midnight
  weekday: Weekday;
}

export function toLocal(utc: Date): LocalTime {
  const [date, hh, mm, iso] = formatInTimeZone(utc, TZ, "yyyy-MM-dd|HH|mm|i").split("|");
  return { date, minutes: Number(hh) * 60 + Number(mm), weekday: Number(iso) as Weekday };
}

/** Amsterdam wall-clock (date + minutes) → UTC instant. DST-safe. */
export function fromLocal(date: string, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${date}T${hh}:${mm}:00`, TZ);
}

export function weekdayOf(date: string): Weekday {
  return toLocal(fromLocal(date, 12 * 60)).weekday;
}

export function addDays(date: string, days: number): string {
  return toLocal(new Date(fromLocal(date, 12 * 60).getTime() + days * 86_400_000)).date;
}

export function fmtMinutes(minutes: number): string {
  const m = ((minutes % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
