import { describe, expect, it } from "vitest";
import {
  freeIntervals,
  isFreeFor,
  mergeIntervals,
  type AvailabilityException,
  type AvailabilityRule,
} from "./availability";

const h = (hours: number) => hours * 60;
// 2026-10-20 is a Tuesday.
const TUE = "2026-10-20";

const rules: AvailabilityRule[] = [
  { userId: 1, weekday: 2, startMin: h(18), endMin: h(20) },
  { userId: 1, weekday: 2, startMin: h(20), endMin: h(23) },
];

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
  it("uses the weekly rule for that weekday", () => {
    expect(freeIntervals(rules, [], 1, TUE)).toEqual([{ start: h(18), end: h(23) }]);
    expect(freeIntervals(rules, [], 1, "2026-10-21")).toEqual([]);
  });

  it("subtracts unavailable exceptions and lets a whole-day one clear everything", () => {
    const partial: AvailabilityException[] = [
      { userId: 1, date: TUE, startMin: h(19), endMin: h(21), kind: "unavailable" },
    ];
    expect(freeIntervals(rules, partial, 1, TUE)).toEqual([
      { start: h(18), end: h(19) },
      { start: h(21), end: h(23) },
    ]);
    const wholeDay: AvailabilityException[] = [
      { userId: 1, date: TUE, startMin: null, endMin: null, kind: "unavailable" },
    ];
    expect(freeIntervals(rules, wholeDay, 1, TUE)).toEqual([]);
  });

  it("adds available exceptions, but unavailable wins on overlap", () => {
    const ex: AvailabilityException[] = [
      { userId: 1, date: "2026-10-21", startMin: h(10), endMin: h(14), kind: "available" },
      { userId: 1, date: "2026-10-21", startMin: h(12), endMin: h(13), kind: "unavailable" },
    ];
    expect(freeIntervals(rules, ex, 1, "2026-10-21")).toEqual([
      { start: h(10), end: h(12) },
      { start: h(13), end: h(14) },
    ]);
  });

  it("ignores other users' data", () => {
    expect(freeIntervals(rules, [], 2, TUE)).toEqual([]);
  });
});

describe("isFreeFor", () => {
  it("requires the whole slot to be covered, across merged rule blocks", () => {
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
