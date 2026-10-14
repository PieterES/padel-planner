import type { Weekday } from "./time";

/** The /me weekly grid: 30-minute rows from 07:00 to 24:00. */
export const GRID_START = 7 * 60;
export const GRID_STEP = 30;
export const GRID_ROWS = (24 * 60 - GRID_START) / GRID_STEP;

/** A cell id "<weekday>:<row>", e.g. "2:26" = Tuesday 20:00. */
export type Cell = `${number}:${number}`;

export function rulesToCells(rules: { weekday: number; startMin: number; endMin: number }[]): Cell[] {
  const cells: Cell[] = [];
  for (const r of rules) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const start = GRID_START + row * GRID_STEP;
      if (start >= r.startMin && start + GRID_STEP <= r.endMin) cells.push(`${r.weekday}:${row}`);
    }
  }
  return cells;
}

/** Merge selected cells into one rule per consecutive run. */
export function cellsToRules(cells: Iterable<string>): { weekday: Weekday; startMin: number; endMin: number }[] {
  const byDay = new Map<number, number[]>();
  for (const c of cells) {
    const [d, r] = c.split(":").map(Number);
    if (!(d >= 1 && d <= 7 && r >= 0 && r < GRID_ROWS)) continue;
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  const rules: { weekday: Weekday; startMin: number; endMin: number }[] = [];
  for (const [weekday, rows] of [...byDay].sort((a, b) => a[0] - b[0])) {
    const sorted = [...new Set(rows)].sort((a, b) => a - b);
    let runStart = sorted[0];
    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === sorted[i - 1] + 1) continue;
      rules.push({
        weekday: weekday as Weekday,
        startMin: GRID_START + runStart * GRID_STEP,
        endMin: GRID_START + (sorted[i - 1] + 1) * GRID_STEP,
      });
      runStart = sorted[i];
    }
  }
  return rules;
}
