"use client";

import { useActionState } from "react";
import type { WeekRanges } from "@/lib/week-ranges";
import { WeekRangesFields } from "../week-ranges-fields";
import { saveWeek } from "./actions";

/** The 7-day form for either the default week (weekStart null) or one specific week. */
export function WeeklyHoursForm({
  userId,
  weekStart,
  values,
  labels,
}: {
  userId: number;
  weekStart: string | null;
  values: WeekRanges;
  labels?: string[];
}) {
  const [message, action, pending] = useActionState(saveWeek.bind(null, userId, weekStart), null);
  return (
    <form action={action}>
      <WeekRangesFields
        prefix="av"
        values={values}
        labels={labels}
        fallback={{ startMin: 19 * 60, endMin: 23 * 60 }}
      />
      <div className="mt-3 flex items-center gap-3">
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : weekStart ? "Save for this week" : "Save default week"}
        </button>
        {message && !pending && <span className="text-sm text-muted">{message}</span>}
      </div>
    </form>
  );
}
