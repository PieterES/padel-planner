"use client";

import { useActionState, useState } from "react";
import { addException } from "./actions";

export function ExceptionForm({ minDate }: { minDate: string }) {
  const [error, action, pending] = useActionState(addException, null);
  const [wholeDay, setWholeDay] = useState(true);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Date
        <input className="input" type="date" name="date" min={minDate} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        I am
        <select className="input" name="kind" defaultValue="unavailable">
          <option value="unavailable">not available</option>
          <option value="available">available</option>
        </select>
      </label>
      <label className="flex items-center gap-2 pb-1 text-sm">
        <input
          type="checkbox"
          name="wholeDay"
          checked={wholeDay}
          onChange={(e) => setWholeDay(e.target.checked)}
        />
        whole day
      </label>
      {!wholeDay && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            From
            <input className="input" type="time" name="start" step={1800} required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            To
            <input className="input" type="time" name="end" step={1800} required />
          </label>
        </>
      )}
      <button className="btn" disabled={pending}>
        Add
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
