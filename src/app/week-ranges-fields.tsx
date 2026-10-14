import type { WeekRanges } from "@/lib/week-ranges";
import { fmtMinutes } from "@/lib/time";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Seven rows of [switch day] from–until. Field names match parseWeekRanges(prefix).
 * Days without a range are switched off and show `fallback` as a starting point.
 */
export function WeekRangesFields({
  prefix,
  values,
  fallback,
  labels = DAYS,
}: {
  prefix: string;
  values: WeekRanges;
  fallback: { startMin: number; endMin: number };
  /** Row labels, e.g. with dates for a specific week. */
  labels?: string[];
}) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      {DAYS.map((day, i) => {
        const v = values[i];
        const weekend = i >= 5;
        return (
          <div
            key={day}
            className={`day-row flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 ${weekend ? "bg-court-soft/40" : "bg-surface"}`}
          >
            <label className="flex w-40 cursor-pointer items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="switch" name={`${prefix}_${i}_on`} defaultChecked={!!v} />
              {labels[i]}
            </label>
            <div className="day-times flex items-center gap-2 text-sm transition-opacity">
              <input
                className="input py-1.5 tabular-nums"
                type="time"
                step={900}
                aria-label={`${labels[i]} from`}
                name={`${prefix}_${i}_start`}
                defaultValue={fmtMinutes(v?.startMin ?? fallback.startMin)}
              />
              <span className="text-muted">until</span>
              <input
                className="input py-1.5 tabular-nums"
                type="time"
                step={900}
                aria-label={`${labels[i]} until`}
                name={`${prefix}_${i}_end`}
                defaultValue={fmtMinutes(v?.endMin ?? fallback.endMin)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
