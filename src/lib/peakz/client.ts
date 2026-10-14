import type { Court, Slot } from "../matching";
import { parseSearch, type FoysSearchLocation } from "./parse";

const API = "https://api.foys.io/court-booking/public/api/v1";
const ORG_ID = "df82f4dd-fd87-4af5-9c2f-656fe1a44357"; // Peakz Padel
const RESERVATION_TYPE_COURT = 6; // "Baanreservering"
const PLAYING_TIMES = [60, 90, 120];

export interface PeakzLocation {
  id: string; // Foys uuid
  slug: string; // used in peakzpadel.nl deep links, e.g. "zeehaenkade"
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json", "x-organisationid": ORG_ID, "x-federationid": ORG_ID },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return (await res.json()) as T;
    } catch (e) {
      if (i >= attempts) throw e;
      await sleep(2_000 * 2 ** (i - 1));
    }
  }
}

export async function fetchLocationDay(
  locationId: string,
  date: string,
): Promise<{ courts: Court[]; slots: Slot[] }> {
  const params = new URLSearchParams({
    reservationTypeId: String(RESERVATION_TYPE_COURT),
    locationId,
    date: `${date}T00:00:00.000Z`,
  });
  for (const t of PLAYING_TIMES) params.append("playingTimes[]", String(t));
  const body = await getJson<FoysSearchLocation[]>(`${API}/locations/search?${params}`);
  return parseSearch(body, locationId);
}

/** Fetch every (location, date) pair sequentially, ~1 request/second. */
export async function fetchAvailability(
  locations: PeakzLocation[],
  dates: string[],
  opts: { delayMs?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<{ courts: Court[]; slots: Slot[] }> {
  const courts = new Map<string, Court>();
  const slots: Slot[] = [];
  const total = locations.length * dates.length;
  let done = 0;
  for (const loc of locations) {
    for (const date of dates) {
      if (done > 0) await sleep(opts.delayMs ?? 1_000);
      const r = await fetchLocationDay(loc.id, date);
      for (const c of r.courts) courts.set(c.id, c);
      slots.push(...r.slots);
      opts.onProgress?.(++done, total);
    }
  }
  return { courts: [...courts.values()], slots };
}

export function deepLink(slug: string, date: string): string {
  return `https://www.peakzpadel.nl/reserveren/court-booking/reservation?daypart=---&date=${date}&location=${slug}`;
}
