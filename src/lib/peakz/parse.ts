import type { Court, Slot } from "../matching";
import { fromLocal } from "../time";

/** Shape of GET /court-booking/public/api/v1/locations/search (fields we use). */
export interface FoysSearchLocation {
  displayName: string;
  inventoryItemsTimeSlots: {
    id: number;
    name: string;
    type: string; // "Double court indoor" | "Single court outdoor" | "Beach volleybal Indoor" …
    timeSlots: {
      startTime: string; // Amsterdam wall-clock, no offset: "2026-10-15T07:00:00"
      endTime: string;
      price: number | null;
      isAvailable: boolean;
      duration: number;
    }[];
  }[];
}

const COURT_TYPE = /^(double|single) court (indoor|outdoor)/i;

export function parseCourtType(type: string): Pick<Court, "kind" | "indoor"> | null {
  const m = COURT_TYPE.exec(type.trim());
  if (!m) return null; // not padel (e.g. beach volleyball)
  return {
    kind: m[1].toLowerCase() as "double" | "single",
    indoor: m[2].toLowerCase() === "indoor",
  };
}

/** Local "YYYY-MM-DDTHH:mm:ss" → UTC Date. */
export function parseLocalTimestamp(s: string): Date {
  const [date, time] = s.split("T");
  const [hh, mm] = time.split(":").map(Number);
  return fromLocal(date, hh * 60 + mm);
}

/** Padel courts of one location, and their currently available slots. */
export function parseSearch(
  body: FoysSearchLocation[],
  locationId: string,
): { courts: Court[]; slots: Slot[] } {
  const courts: Court[] = [];
  const slots: Slot[] = [];
  for (const loc of body) {
    for (const item of loc.inventoryItemsTimeSlots) {
      const type = parseCourtType(item.type);
      if (!type) continue;
      const court: Court = {
        id: String(item.id),
        locationId,
        locationName: loc.displayName,
        name: item.name.trim(),
        ...type,
      };
      courts.push(court);
      for (const t of item.timeSlots) {
        if (!t.isAvailable) continue;
        slots.push({
          courtId: court.id,
          startUtc: parseLocalTimestamp(t.startTime),
          durationMin: t.duration,
          price: t.price,
        });
      }
    }
  }
  return { courts, slots };
}
