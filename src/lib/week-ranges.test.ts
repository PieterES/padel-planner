import { describe, expect, it } from "vitest";
import { parseWeekRanges, rulesToWeekRanges } from "./week-ranges";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("parseWeekRanges", () => {
  it("reads checked days, treats 00:00 end as midnight, drops invalid ranges", () => {
    const r = parseWeekRanges(
      form({
        av_0_on: "on", av_0_start: "19:00", av_0_end: "23:00",
        av_1_start: "19:00", av_1_end: "23:00", // not checked
        av_2_on: "on", av_2_start: "21:00", av_2_end: "00:00",
        av_3_on: "on", av_3_start: "22:00", av_3_end: "20:00", // end before start
        av_4_on: "on", av_4_start: "", av_4_end: "20:00",
      }),
      "av",
    );
    expect(r).toEqual([
      { startMin: 19 * 60, endMin: 23 * 60 },
      null,
      { startMin: 21 * 60, endMin: 24 * 60 },
      null,
      null,
      null,
      null,
    ]);
  });
});

describe("rulesToWeekRanges", () => {
  it("collapses several rules on a day into one range", () => {
    const r = rulesToWeekRanges([
      { weekday: 2, startMin: 18 * 60, endMin: 19 * 60 },
      { weekday: 2, startMin: 20 * 60, endMin: 22 * 60 },
      { weekday: 7, startMin: 10 * 60, endMin: 12 * 60 },
    ]);
    expect(r[1]).toEqual({ startMin: 18 * 60, endMin: 22 * 60 });
    expect(r[6]).toEqual({ startMin: 10 * 60, endMin: 12 * 60 });
    expect(r.filter(Boolean)).toHaveLength(2);
  });
});
