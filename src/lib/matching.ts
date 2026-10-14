import { isFreeFor, type AvailabilityException, type AvailabilityRule } from "./availability";
import { fmtMinutes, toLocal } from "./time";

export interface Court {
  id: string;
  locationId: string;
  locationName: string;
  name: string;
  /** null = unknown; excluded when the group asks for indoor or outdoor. */
  indoor: boolean | null;
  kind: "double" | "single" | null;
}

export interface Slot {
  courtId: string;
  startUtc: Date;
  durationMin: number;
  price: number | null;
}

export interface Player {
  id: number;
  name: string;
}

export interface TimeWindow {
  startMin: number;
  endMin: number;
}

export interface Constraints {
  locationIds: string[];
  indoorOutdoor: "indoor" | "outdoor" | "any";
  durations: number[];
  /** Index 0 = Monday … 6 = Sunday. null = don't play that day. */
  windows: (TimeWindow | null)[];
  minPlayers: number;
}

/** One time slot at one location, possibly with several free courts. */
export interface MatchGroup {
  key: string;
  locationId: string;
  locationName: string;
  startUtc: Date;
  durationMin: number;
  courts: Court[];
  players: Player[];
}

export interface MatchInput {
  players: Player[];
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  courts: Court[];
  slots: Slot[];
  constraints: Constraints;
  now: Date;
}

export function slotPassesConstraints(court: Court, slot: Slot, c: Constraints): boolean {
  if (!c.locationIds.includes(court.locationId)) return false;
  if (court.kind === "single") return false;
  if (c.indoorOutdoor === "indoor" && court.indoor !== true) return false;
  if (c.indoorOutdoor === "outdoor" && court.indoor !== false) return false;
  if (!c.durations.includes(slot.durationMin)) return false;
  const local = toLocal(slot.startUtc);
  const window = c.windows[local.weekday - 1];
  if (!window) return false;
  return local.minutes >= window.startMin && local.minutes + slot.durationMin <= window.endMin;
}

export function matchKey(locationId: string, startUtc: Date, durationMin: number): string {
  return `${locationId}|${startUtc.toISOString()}|${durationMin}`;
}

/** Ranked by number of free players (desc), then start time (asc). */
export function findMatches(input: MatchInput): MatchGroup[] {
  const courtsById = new Map(input.courts.map((c) => [c.id, c]));
  const groups = new Map<string, MatchGroup>();

  for (const slot of input.slots) {
    if (slot.startUtc <= input.now) continue;
    const court = courtsById.get(slot.courtId);
    if (!court || !slotPassesConstraints(court, slot, input.constraints)) continue;

    const key = matchKey(court.locationId, slot.startUtc, slot.durationMin);
    const existing = groups.get(key);
    if (existing) {
      if (!existing.courts.some((c) => c.id === court.id)) existing.courts.push(court);
      continue;
    }

    const local = toLocal(slot.startUtc);
    const players = input.players.filter((p) =>
      isFreeFor(input.rules, input.exceptions, p.id, local.date, local.minutes, slot.durationMin),
    );
    if (players.length < input.constraints.minPlayers) continue;

    groups.set(key, {
      key,
      locationId: court.locationId,
      locationName: court.locationName,
      startUtc: slot.startUtc,
      durationMin: slot.durationMin,
      courts: [court],
      players,
    });
  }

  return [...groups.values()].sort(
    (a, b) =>
      b.players.length - a.players.length || a.startUtc.getTime() - b.startUtc.getTime(),
  );
}

/** Signature used to detect whether an already-posted match changed. */
export function playersSignature(group: MatchGroup): string {
  return group.players
    .map((p) => p.id)
    .sort((a, b) => a - b)
    .join(",");
}

/** Top N matches that were never posted, or whose player set changed since. */
export function selectNewMatches(
  groups: MatchGroup[],
  posted: Map<string, string>,
  topN: number,
): MatchGroup[] {
  return groups.filter((g) => posted.get(g.key) !== playersSignature(g)).slice(0, topN);
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function describeWhen(startUtc: Date, durationMin: number): string {
  const l = toLocal(startUtc);
  const [, m, d] = l.date.split("-").map(Number);
  return `${DAY_NAMES[l.weekday - 1]} ${d} ${MONTHS[m - 1]} ${fmtMinutes(l.minutes)}–${fmtMinutes(l.minutes + durationMin)}`;
}

function describeIndoor(courts: Court[]): string | null {
  const kinds = new Set(courts.map((c) => c.indoor));
  if (kinds.size !== 1) return null;
  const [v] = kinds;
  return v === true ? "indoor" : v === false ? "outdoor" : null;
}

export function formatWhatsAppMessage(
  groups: MatchGroup[],
  scrapedAt: Date,
  deepLink: (g: MatchGroup) => string,
): string {
  const lines = [`🎾 Padel matches (scraped ${describeWhen(scrapedAt, 0).split("–")[0]})`];
  for (const g of groups) {
    const meta = [
      describeWhen(g.startUtc, g.durationMin),
      g.locationName,
      describeIndoor(g.courts),
      `${g.courts.length} court${g.courts.length === 1 ? "" : "s"} free`,
    ].filter(Boolean);
    lines.push(
      "",
      `• ${meta.join(" · ")}`,
      `  Free: ${g.players.map((p) => p.name).join(", ")}`,
      `  → ${deepLink(g)}`,
    );
  }
  return lines.join("\n");
}
