import { describe, expect, it } from "vitest";
import {
  freeIntervals,
  isFreeFor,
  mergeIntervals,
  type AvailabilityRule,
  type WeekOverride,
} from "./availability";
import { mondayOf } from "./time";

const h = (hours: number) => hours * 60;
// 2026-10-20 is a Tuesday; its week starts Monday 2026-10-19.
const TUE = "2026-10-20";

const rules: AvailabilityRule[] = [
  { userId: 1, weekday: 2, startMin: h(18), endMin: h(20) },
  { userId: 1, weekday: 2, startMin: h(20), endMin: h(23) },
];

const week = (weekStart: string, ranges: WeekOverride["ranges"]): WeekOverride => ({
  userId: 1,
  weekStart,
  ranges,
});
const none: WeekOverride["ranges"] = [null, null, null, null, null, null, null];

describe("mondayOf", () => {
  it("finds the Monday of the week", () => {
    expect(mondayOf(TUE)).toBe("2026-10-19");
    expect(mondayOf("2026-10-19")).toBe("2026-10-19");
    expect(mondayOf("2026-10-25")).toBe("2026-10-19"); // Sunday, DST change day
  });
});

describe("mergeIntervals", () => {
  it("merges adjacent and overlapping blocks", () => {
    expect(
      mergeIntervals([
        { start: 60, end: 120 },
        { start: 0, end: 60 },
        { start: 200, end: 300 },
        { start: 250, end: 260 },
      ]),
    ).toEqual([
      { start: 0, end: 120 },
      { start: 200, end: 300 },
    ]);
  });
});

describe("freeIntervals", () => {
  it("uses the default week for that weekday", () => {
    expect(freeIntervals(rules, [], 1, TUE)).toEqual([{ start: h(18), end: h(23) }]);
    expect(freeIntervals(rules, [], 1, "2026-10-21")).toEqual([]);
  });

  it("a week override replaces the whole default week, only for that week", () => {
    const ranges = [...none];
    ranges[2] = { startMin: h(10), endMin: h(14) }; // Wednesday
    const o = [week("2026-10-19", ranges)];
    expect(freeIntervals(rules, o, 1, TUE)).toEqual([]); // Tuesday not ticked that week
    expect(freeIntervals(rules, o, 1, "2026-10-21")).toEqual([{ start: h(10), end: h(14) }]);
    expect(freeIntervals(rules, o, 1, "2026-10-27")).toEqual([{ start: h(18), end: h(23) }]); // next week: default
  });

  it("ignores other users' data", () => {
    expect(freeIntervals(rules, [week("2026-10-19", none)], 2, TUE)).toEqual([]);
  });
});

describe("isFreeFor", () => {
  it("requires the whole slot to be covered", () => {
    expect(isFreeFor(rules, [], 1, TUE, h(19), 90)).toBe(true);
    expect(isFreeFor(rules, [], 1, TUE, h(22), 90)).toBe(false);
  });

  it("checks the next day for slots past midnight", () => {
    const late: AvailabilityRule[] = [
      { userId: 1, weekday: 2, startMin: h(22), endMin: h(24) },
      { userId: 1, weekday: 3, startMin: 0, endMin: h(1) },
    ];
    expect(isFreeFor(late, [], 1, TUE, h(23), 90)).toBe(true); // ends 00:30 Wed
    expect(isFreeFor(late, [], 1, TUE, h(23), 150)).toBe(false); // ends 01:30 Wed
    expect(isFreeFor(late.slice(0, 1), [], 1, TUE, h(23), 60)).toBe(true);
    expect(isFreeFor(late.slice(0, 1), [], 1, TUE, h(23) + 30, 60)).toBe(false);
  });
});
