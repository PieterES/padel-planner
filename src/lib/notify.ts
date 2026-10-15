import { describeWhen, type MatchGroup } from "./matching";

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag?: string; // same tag replaces an older notification instead of stacking
}

const venue = (m: { locationName: string }) => m.locationName.split(" - ").at(-1) ?? m.locationName;
export const describeMatch = (m: { startUtc: Date; durationMin: number; locationName: string }) =>
  `${describeWhen(m.startUtc, m.durationMin)} · ${venue(m)}`;

/**
 * After a court check: for each friend, the matches they can play that were
 * not in the previous run (and aren't booked yet). Friends with none get nothing.
 */
export function newMatchMessages(
  matches: MatchGroup[],
  previousKeys: Set<string>,
  bookedKeys: Set<string>,
): Map<number, PushMessage> {
  const perUser = new Map<number, MatchGroup[]>();
  for (const m of matches) {
    if (previousKeys.has(m.key) || bookedKeys.has(m.key)) continue;
    for (const p of m.players) perUser.set(p.id, [...(perUser.get(p.id) ?? []), m]);
  }
  const out = new Map<number, PushMessage>();
  for (const [userId, ms] of perUser) {
    const first = [...ms].sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime())[0];
    out.set(userId, {
      title: ms.length === 1 ? "New padel match for you 🎾" : `${ms.length} new padel matches for you 🎾`,
      body:
        ms.length === 1
          ? `${describeMatch(first)} · ${first.players.length} free`
          : `First: ${describeMatch(first)}. Tap to see them all.`,
      url: "/matches?mine=1",
      tag: "new-matches",
    });
  }
  return out;
}

export function readyMessage(m: { startUtc: Date; durationMin: number; locationName: string }, names: string[]): PushMessage {
  return {
    title: "Enough players: book it! 🎾",
    body: `${describeMatch(m)}: ${names.join(", ")} are in.`,
    url: "/matches",
  };
}

export function bookedMessage(
  m: { startUtc: Date; durationMin: number; locationName: string },
  bookedBy: string,
): PushMessage {
  return {
    title: `${bookedBy} booked a court ✅`,
    body: `${describeMatch(m)}. See you there!`,
    url: "/matches",
  };
}
