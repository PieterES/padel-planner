import { describe, expect, it } from "vitest";
import { cellsToRules, rulesToCells } from "./grid";

describe("grid ↔ rules", () => {
  it("merges consecutive cells into rules per weekday", () => {
    // Tue rows 24..27 = 19:00–21:00, Tue row 30 = 22:00–22:30, Sat row 0 = 07:00–07:30
    expect(cellsToRules(["2:25", "2:24", "2:26", "2:27", "2:30", "6:0", "9:1", "2:99"])).toEqual([
      { weekday: 2, startMin: 19 * 60, endMin: 21 * 60 },
      { weekday: 2, startMin: 22 * 60, endMin: 22 * 60 + 30 },
      { weekday: 6, startMin: 7 * 60, endMin: 7 * 60 + 30 },
    ]);
  });

  it("round-trips", () => {
    const rules = [{ weekday: 4 as const, startMin: 18 * 60, endMin: 24 * 60 }];
    expect(cellsToRules(rulesToCells(rules))).toEqual(rules);
  });
});
