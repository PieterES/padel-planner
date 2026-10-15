import { describe, expect, it } from "vitest";
import type { MatchGroup } from "./matching";
import { bookedMessage, newMatchMessages, readyMessage } from "./notify";
import { fromLocal } from "./time";

const match = (key: string, date: string, hour: number, playerIds: number[]): MatchGroup => ({
  key,
  locationId: "utr",
  locationName: "Utrecht - Zeehaenkade",
  startUtc: fromLocal(date, hour * 60),
  durationMin: 90,
  courts: [],
  players: playerIds.map((id) => ({ id, name: `P${id}` })),
  price: null,
});

describe("newMatchMessages", () => {
  const a = match("a", "2026-10-21", 20, [1, 2, 3, 4]);
  const b = match("b", "2026-10-20", 19, [1, 2, 3, 5]);
  const c = match("c", "2026-10-22", 20, [1, 2, 3, 4]);

  it("only notifies about matches that are new since the last run, per player", () => {
    const msgs = newMatchMessages([a, b, c], new Set(["c"]), new Set());
    expect([...msgs.keys()].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(msgs.get(1)?.title).toBe("2 new padel matches for you 🎾");
    expect(msgs.get(1)?.body).toBe("First: Tue 20 Oct 19:00–20:30 · Zeehaenkade. Tap to see them all.");
    expect(msgs.get(5)?.title).toBe("New padel match for you 🎾");
    expect(msgs.get(5)?.body).toBe("Tue 20 Oct 19:00–20:30 · Zeehaenkade · 4 free");
    expect(msgs.get(4)?.body).toContain("Wed 21 Oct");
  });

  it("skips booked matches and sends nothing when nothing is new", () => {
    expect(newMatchMessages([a], new Set(), new Set(["a"])).size).toBe(0);
    expect(newMatchMessages([a, b], new Set(["a", "b"]), new Set()).size).toBe(0);
  });
});

describe("coordination messages", () => {
  it("ready + booked texts", () => {
    const m = match("a", "2026-10-21", 20, []);
    expect(readyMessage(m, ["Anna", "Bas", "Chris", "Dewi"]).body).toBe(
      "Wed 21 Oct 20:00–21:30 · Zeehaenkade: Anna, Bas, Chris, Dewi are in.",
    );
    expect(bookedMessage(m, "Anna").title).toBe("Anna booked a court ✅");
  });
});
