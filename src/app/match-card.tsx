import type { ReactNode } from "react";
import { pricePerPerson } from "@/lib/matching";
import { deepLink } from "@/lib/peakz/client";
import { fmtMinutes, toLocal } from "@/lib/time";
import { ShareButton } from "./share-button";
import { AvatarStack, Icon } from "./ui";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Plain, serializable view of one match (so client lists can render it too). */
export interface MatchCardData {
  key: string;
  rank?: number;
  dow: string;
  day: number;
  month: string;
  time: string; // "20:00–21:30"
  durationMin: number;
  city: string;
  venue: string;
  courtsFree: number;
  kinds: string[]; // ["indoor"], ["outdoor"], or both
  players: string[];
  groupSize: number;
  link: string;
  mine: boolean;
  /** "€10,50" per person, or null when Peakz didn't give a price. */
  pricePP: string | null;
  shareText: string;
}

const euro = (n: number) => `€${n.toFixed(2).replace(".", ",")}`;
const appUrl = () =>
  (process.env.PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function toMatchCard(
  m: {
    locationId: string;
    locationName: string; // "Utrecht - Zeehaenkade"
    startUtc: Date;
    durationMin: number;
    courts: { indoor: boolean | null }[];
    players: { id: number; name: string }[];
    price?: number | null;
  },
  opts: {
    slugs: Map<string, string>;
    groupSize: number;
    viewerId?: number;
    rank?: number;
  },
): MatchCardData {
  const l = toLocal(m.startUtc);
  const [, month, day] = l.date.split("-").map(Number);
  const [city, venue] = m.locationName.includes(" - ")
    ? m.locationName.split(" - ")
    : ["", m.locationName];
  const time = `${fmtMinutes(l.minutes)}–${fmtMinutes(l.minutes + m.durationMin)}`;
  const pp = pricePerPerson(m.price ?? null);
  const pricePP = pp === null ? null : euro(pp);
  const where = city ? `${venue} (${city})` : venue;
  return {
    key: `${m.locationId}|${m.startUtc.toISOString()}|${m.durationMin}`,
    rank: opts.rank,
    dow: DOW[l.weekday - 1],
    day,
    month: MONTHS[month - 1],
    time,
    durationMin: m.durationMin,
    city,
    venue,
    courtsFree: m.courts.length,
    kinds: [
      ...new Set(m.courts.map((c) => (c.indoor ? "indoor" : "outdoor"))),
    ].sort(),
    players: m.players.map((p) => p.name),
    groupSize: opts.groupSize,
    link: deepLink(opts.slugs.get(m.locationId) ?? "", l.date),
    mine:
      opts.viewerId === undefined ||
      m.players.some((p) => p.id === opts.viewerId),
    pricePP,
    shareText:
      `🎾 Padel? ${DOW[l.weekday - 1]} ${day} ${MONTHS[month - 1]} ${time} at ${where}` +
      ` · ${m.players.length} of us free${pricePP ? ` · ${pricePP} p.p.` : ""}\n${appUrl()}/matches`,
  };
}

export function MatchCard({
  m,
  showDate = true,
  children,
}: {
  m: MatchCardData;
  showDate?: boolean;
  /** Footer, e.g. "I'm in" / booking actions. */
  children?: ReactNode;
}) {
  return (
    <li
      className={`card group transition hover:-translate-y-0.5 ${m.mine ? "" : "opacity-60"}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 sm:contents">
          {showDate && (
            <div className="relative grid h-16 w-16 flex-none place-items-center rounded-xl bg-navy text-navy-ink">
              <div className="text-center leading-none">
                <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                  {m.dow}
                </div>
                <div className="font-display text-2xl font-bold text-lime">
                  {m.day}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                  {m.month}
                </div>
              </div>
              {m.rank !== undefined && (
                <span
                  aria-label={`Rank ${m.rank}`}
                  className="absolute -top-2 -left-2 grid h-6 min-w-6 place-items-center rounded-full bg-lime px-1 text-[11px] font-bold text-lime-ink ring-2 ring-card"
                >
                  {m.rank}
                </span>
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-xl font-bold tabular-nums">
                {m.time}
              </span>
              <span className="truncate font-medium">{m.venue}</span>
              {m.city && <span className="text-sm text-muted">{m.city}</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {m.kinds.map((k) => (
                <span key={k} className="chip">
                  <Icon
                    name={k === "indoor" ? "indoor" : "outdoor"}
                    className="h-3 w-3"
                  />
                  {k}
                </span>
              ))}
              <span className="chip-muted">
                {m.courtsFree} court{m.courtsFree === 1 ? "" : "s"} free
              </span>
              <span className="chip-muted">{m.durationMin} min</span>
              {m.pricePP && (
                <span className="chip-muted">{m.pricePP} p.p.</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:justify-end">
          <div className="flex items-center gap-2" title={m.players.join(", ")}>
            <AvatarStack names={m.players} max={5} />
            <span className="text-sm whitespace-nowrap text-muted">
              <strong className="text-foreground">{m.players.length}</strong>
              {m.groupSize ? ` of ${m.groupSize}` : ""} free
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShareButton text={m.shareText} />
            <a
              className="btn-lime no-underline"
              href={m.link}
              target="_blank"
              rel="noreferrer"
            >
              Peakz →
            </a>
          </div>
        </div>
      </div>
      {children && (
        <div className="mt-4 border-t border-line pt-3">{children}</div>
      )}
    </li>
  );
}
