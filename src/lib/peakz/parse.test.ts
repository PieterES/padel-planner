import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCourtType, parseSearch, type FoysSearchLocation } from "./parse";
import { toLocal } from "../time";

const fixture: FoysSearchLocation[] = JSON.parse(
  readFileSync(new URL("./__fixtures__/search-zeehaenkade-2026-10-15.json", import.meta.url), "utf8"),
);
const ZEEHAENKADE = "f37fb2ae-bf24-44f1-9b81-61e6c0784840";

describe("parseCourtType", () => {
  it("recognises padel courts and rejects other sports", () => {
    expect(parseCourtType("Double court indoor")).toEqual({ kind: "double", indoor: true });
    expect(parseCourtType("Single court outdoor")).toEqual({ kind: "single", indoor: false });
    expect(parseCourtType("Beach volleybal Indoor")).toBeNull();
  });
});

describe("parseSearch (captured Zeehaenkade response)", () => {
  const { courts, slots } = parseSearch(fixture, ZEEHAENKADE);

  it("keeps the 9 padel courts and drops beach volleyball", () => {
    expect(courts).toHaveLength(9);
    expect(courts.filter((c) => c.indoor)).toHaveLength(4);
    expect(courts.filter((c) => c.kind === "single").map((c) => c.name)).toEqual(["Baan 9"]);
    expect(courts[0]).toMatchObject({
      id: "63",
      locationId: ZEEHAENKADE,
      locationName: "Utrecht - Zeehaenkade",
      name: "Baan 1 | 🎥",
    });
  });

  it("keeps only available slots and reads times as Amsterdam local", () => {
    const padelIds = new Set(courts.map((c) => c.id));
    const expected = fixture[0].inventoryItemsTimeSlots
      .filter((i) => padelIds.has(String(i.id)))
      .flatMap((i) => i.timeSlots.filter((t) => t.isAvailable));
    expect(slots).toHaveLength(expected.length);
    for (const [i, s] of slots.entries()) {
      const l = toLocal(s.startUtc);
      expect(`${l.date}T${String(Math.floor(l.minutes / 60)).padStart(2, "0")}:${String(l.minutes % 60).padStart(2, "0")}:00`).toBe(
        expected[i].startTime,
      );
      expect(s.durationMin).toBe(expected[i].duration);
    }
  });
});
