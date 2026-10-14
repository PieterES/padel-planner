"use client";

import { useRef, useState, useTransition } from "react";
import { GRID_ROWS, GRID_START, GRID_STEP } from "@/lib/grid";
import { fmtMinutes } from "@/lib/time";
import { saveWeeklyGrid } from "./actions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Tap or drag to paint 30-minute blocks of weekly availability. */
export function WeeklyGrid({ initial }: { initial: string[] }) {
  const [cells, setCells] = useState(() => new Set(initial));
  const [dirty, setDirty] = useState(false);
  const [saving, startSaving] = useTransition();
  const paint = useRef<boolean | null>(null); // true = adding, false = removing

  const apply = (id: string | undefined) => {
    if (!id || paint.current === null) return;
    setCells((prev) => {
      if (prev.has(id) === paint.current) return prev;
      const next = new Set(prev);
      if (paint.current) next.add(id);
      else next.delete(id);
      return next;
    });
    setDirty(true);
  };

  const cellAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y) as HTMLElement | null)?.dataset.cell;

  return (
    <div>
      <div
        className="grid touch-none select-none text-xs"
        style={{ gridTemplateColumns: `3rem repeat(7, minmax(0, 1fr))` }}
        onPointerDown={(e) => {
          const id = cellAt(e.clientX, e.clientY);
          if (!id) return;
          paint.current = !cells.has(id);
          apply(id);
        }}
        onPointerMove={(e) => apply(cellAt(e.clientX, e.clientY))}
        onPointerUp={() => (paint.current = null)}
        onPointerLeave={() => (paint.current = null)}
      >
        <div />
        {DAYS.map((d) => (
          <div key={d} className="pb-1 text-center font-medium">
            {d}
          </div>
        ))}
        {Array.from({ length: GRID_ROWS }, (_, row) => (
          <Row key={row} row={row} cells={cells} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="btn"
          disabled={!dirty || saving}
          onClick={() =>
            startSaving(async () => {
              await saveWeeklyGrid([...cells]);
              setDirty(false);
            })
          }
        >
          {saving ? "Saving…" : "Save weekly availability"}
        </button>
        {dirty && <span className="text-sm text-muted">Unsaved changes</span>}
      </div>
    </div>
  );
}

function Row({ row, cells }: { row: number; cells: Set<string> }) {
  const start = GRID_START + row * GRID_STEP;
  return (
    <>
      <div className="pr-1 text-right leading-6 text-muted">
        {start % 60 === 0 ? fmtMinutes(start) : ""}
      </div>
      {DAYS.map((_, i) => {
        const id = `${i + 1}:${row}`;
        return (
          <div
            key={id}
            data-cell={id}
            className={`h-6 border-l border-line ${start % 60 === 0 ? "border-t" : ""} ${
              cells.has(id) ? "bg-accent" : "hover:bg-accent-soft"
            }`}
          />
        );
      })}
    </>
  );
}
