import { describeWhen } from "@/lib/matching";
import { deepLink } from "@/lib/peakz/client";
import { toLocal } from "@/lib/time";

/** Plain, serializable view of one match (so client lists can render it too). */
export interface MatchCardData {
  key: string;
  rank?: number;
  when: string; // e.g. "Tue 20 Oct 20:00–21:30" or just "20:00–21:30"
  locationName: string;
  courts: string; // e.g. "2 courts free (indoor)"
  players: string[];
  link: string;
  mine: boolean;
}

export function toMatchCard(
  m: {
    locationId: string;
    locationName: string;
    startUtc: Date;
    durationMin: number;
    courts: { indoor: boolean | null }[];
    players: { id: number; name: string }[];
  },
  opts: { slugs: Map<string, string>; viewerId?: number; rank?: number; withDate: boolean },
): MatchCardData {
  const when = describeWhen(m.startUtc, m.durationMin);
  const kinds = [...new Set(m.courts.map((c) => (c.indoor ? "indoor" : "outdoor")))].join(" / ");
  return {
    key: `${m.locationId}|${m.startUtc.toISOString()}|${m.durationMin}`,
    rank: opts.rank,
    when: opts.withDate ? when : when.split(" ").slice(3).join(" "),
    locationName: m.locationName,
    courts: `${m.courts.length} court${m.courts.length === 1 ? "" : "s"} free (${kinds})`,
    players: m.players.map((p) => p.name),
    link: deepLink(opts.slugs.get(m.locationId) ?? "", toLocal(m.startUtc).date),
    mine: opts.viewerId === undefined || m.players.some((p) => p.id === opts.viewerId),
  };
}

export function MatchCard({ m }: { m: MatchCardData }) {
  return (
    <li className={`card ${m.mine ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        {m.rank !== undefined && <span className="text-sm text-muted">#{m.rank}</span>}
        <span className="font-semibold">{m.when}</span>
        <span>{m.locationName}</span>
        <span className="text-sm text-muted">{m.courts}</span>
        <a className="ml-auto text-sm" href={m.link} target="_blank" rel="noreferrer">
          Book at Peakz →
        </a>
      </div>
      <p className="mt-1 text-sm">
        <span className="text-muted">{m.players.length} free: </span>
        {m.players.join(", ")}
      </p>
    </li>
  );
}
