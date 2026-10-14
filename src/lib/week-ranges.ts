import type { TimeWindow } from "./matching";
import { DAY_MIN } from "./time";

/**
 * One optional from–until range per weekday (index 0 = Monday). Used for both
 * the group's playing hours and each friend's weekly availability.
 */
export type WeekRanges = (TimeWindow | null)[];

/** "HH:mm" → minutes; "00:00" as an end time means midnight (24:00). */
function parseTime(value: FormDataEntryValue | null, isEnd: boolean): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(String(value ?? ""));
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return isEnd && min === 0 ? DAY_MIN : min;
}

/** Reads `<prefix>_<i>_on|start|end` fields (see WeekRangesFields). Invalid days become null. */
export function parseWeekRanges(formData: FormData, prefix: string): WeekRanges {
  return Array.from({ length: 7 }, (_, i) => {
    if (!formData.get(`${prefix}_${i}_on`)) return null;
    const startMin = parseTime(formData.get(`${prefix}_${i}_start`), false);
    const endMin = parseTime(formData.get(`${prefix}_${i}_end`), true);
    return startMin !== null && endMin !== null && endMin > startMin ? { startMin, endMin } : null;
  });
}

/** Availability rules (possibly several per day) → one range per day (earliest start, latest end). */
export function rulesToWeekRanges(rules: { weekday: number; startMin: number; endMin: number }[]): WeekRanges {
  return Array.from({ length: 7 }, (_, i) => {
    const day = rules.filter((r) => r.weekday === i + 1);
    if (!day.length) return null;
    return {
      startMin: Math.min(...day.map((r) => r.startMin)),
      endMin: Math.max(...day.map((r) => r.endMin)),
    };
  });
}
