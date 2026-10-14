import type { WeekRanges } from "@/lib/week-ranges";
import { fmtMinutes } from "@/lib/time";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Seven rows of [✓ day] from–until. Field names match parseWeekRanges(prefix).
 * Days without a range are unchecked and show `fallback` as a starting point.
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
    <div className="space-y-1.5 text-sm">
      {DAYS.map((day, i) => {
        const v = values[i];
        return (
          <div key={day} className="flex items-center gap-2">
            <label className="flex w-36 items-center gap-1.5">
              <input type="checkbox" name={`${prefix}_${i}_on`} defaultChecked={!!v} />
              {labels[i]}
            </label>
            <input
              className="input"
              type="time"
              step={900}
              name={`${prefix}_${i}_start`}
              defaultValue={fmtMinutes(v?.startMin ?? fallback.startMin)}
            />
            –
            <input
              className="input"
              type="time"
              step={900}
              name={`${prefix}_${i}_end`}
              defaultValue={fmtMinutes(v?.endMin ?? fallback.endMin)}
            />
          </div>
        );
      })}
    </div>
  );
}
