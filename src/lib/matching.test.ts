import { describe, expect, it } from "vitest";
import type { AvailabilityRule } from "./availability";
import {
  describeWhen,
  findMatches,
  type Constraints,
  type Court,
  type Player,
  type Slot,
} from "./matching";
import { fromLocal, toLocal } from "./time";

const h = (hours: number) => hours * 60;

const players: Player[] = ["Anna", "Bas", "Chris", "Dewi", "Eva", "Floor", "Gijs"].map(
  (name, i) => ({ id: i + 1, name }),
);

const courts: Court[] = [
  { id: "u1", locationId: "utr", locationName: "Peakz Utrecht", name: "Baan 1", indoor: true, kind: "double" },
  { id: "u2", locationId: "utr", locationName: "Peakz Utrecht", name: "Baan 2", indoor: true, kind: "double" },
  { id: "u3", locationId: "utr", locationName: "Peakz Utrecht", name: "Baan 3", indoor: false, kind: "double" },
  { id: "u4", locationId: "utr", locationName: "Peakz Utrecht", name: "Single", indoor: true, kind: "single" },
  { id: "a1", locationId: "ams", locationName: "Peakz Amsterdam", name: "Baan 1", indoor: true, kind: "double" },
];

// Weekday evenings 19:00–23:00, Mon–Fri.
const evenings: (Constraints["windows"][number])[] = [1, 2, 3, 4, 5].map(() => ({
  startMin: h(19),
  endMin: h(23),
}));
const constraints: Constraints = {
  locationIds: ["utr"],
  indoorOutdoor: "indoor",
  durations: [90],
  windows: [...evenings, null, null],
  minPlayers: 4,
};

// Tue 2026-10-20: Anna–Eva free 19–23. Floor only 21–23. Gijs never.
const rules: AvailabilityRule[] = [
  ...[1, 2, 3, 4, 5].map((userId) => ({ userId, weekday: 2 as const, startMin: h(19), endMin: h(23) })),
  { userId: 6, weekday: 2, startMin: h(21), endMin: h(23) },
];

const slot = (courtId: string, date: string, minutes: number, durationMin = 90): Slot => ({
  courtId,
  startUtc: fromLocal(date, minutes),
  durationMin,
  price: null,
});

const now = fromLocal("2026-10-14", h(12));

const run = (slots: Slot[], extra: Partial<Constraints> = {}) =>
  findMatches({
    players,
    rules,
    exceptions: [],
    courts,
    slots,
    constraints: { ...constraints, ...extra },
    now,
  });

describe("findMatches", () => {
  it("groups free courts at the same location/time and lists free players", () => {
    const [m, ...rest] = run([slot("u1", "2026-10-20", h(20)), slot("u2", "2026-10-20", h(20))]);
    expect(rest).toHaveLength(0);
    expect(m.courts.map((c) => c.id)).toEqual(["u1", "u2"]);
    expect(m.players.map((p) => p.name)).toEqual(["Anna", "Bas", "Chris", "Dewi", "Eva"]);
  });

  it("applies location, indoor, single-court, duration and window constraints", () => {
    expect(run([slot("a1", "2026-10-20", h(20))])).toEqual([]); // wrong club
    expect(run([slot("u3", "2026-10-20", h(20))])).toEqual([]); // outdoor
    expect(run([slot("u4", "2026-10-20", h(20))])).toEqual([]); // single court
    expect(run([slot("u1", "2026-10-20", h(20), 60)])).toEqual([]); // duration
    expect(run([slot("u1", "2026-10-20", h(22))])).toEqual([]); // ends after window
    expect(run([slot("u3", "2026-10-20", h(20))], { indoorOutdoor: "any" })).toHaveLength(1);
  });

  it("needs minPlayers and skips past slots", () => {
    expect(run([slot("u1", "2026-10-20", h(20))], { minPlayers: 6 })).toEqual([]);
    expect(
      findMatches({
        players, rules, exceptions: [], courts, constraints,
        slots: [slot("u1", "2026-10-20", h(20))],
        now: fromLocal("2026-10-21", 0),
      }),
    ).toEqual([]);
  });

  it("ranks by player count, then time", () => {
    const ms = run([
      slot("u1", "2026-10-20", h(19)), // 5 players
      slot("u1", "2026-10-20", h(21)) /* 6 players (Floor too) */,
      slot("u1", "2026-10-20", h(19) + 30), // 5 players, later
    ]);
    expect(ms.map((m) => [toLocal(m.startUtc).minutes, m.players.length])).toEqual([
      [h(21), 6],
      [h(19), 5],
      [h(19) + 30, 5],
    ]);
  });

  it("is DST-safe across the 25 Oct 2026 clock change", () => {
    const tueAfter: AvailabilityRule[] = [1, 2, 3, 4].map((userId) => ({
      userId, weekday: 2 as const, startMin: h(20), endMin: h(22),
    }));
    const s = slot("u1", "2026-10-27", h(20));
    expect(s.startUtc.toISOString()).toBe("2026-10-27T19:00:00.000Z"); // CET = UTC+1
    const ms = findMatches({
      players, rules: tueAfter, exceptions: [], courts, constraints, slots: [s], now,
    });
    expect(ms).toHaveLength(1);
  });
});

describe("describeWhen", () => {
  it("formats in Amsterdam time", () => {
    expect(describeWhen(fromLocal("2026-10-20", 20 * 60), 90)).toBe("Tue 20 Oct 20:00–21:30");
  });
});
