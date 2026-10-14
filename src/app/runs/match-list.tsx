"use client";

import { useState } from "react";
import { MatchCard, type MatchCardData } from "../match-card";

const FIRST = 5;
const STEP = 10;

/** Top 5, then "Show more" reveals 10 at a time. */
export function MatchList({ matches }: { matches: MatchCardData[] }) {
  const [shown, setShown] = useState(FIRST);
  const rest = matches.length - shown;
  return (
    <>
      <ul className="space-y-2">
        {matches.slice(0, shown).map((m) => (
          <MatchCard key={m.key} m={m} />
        ))}
      </ul>
      {rest > 0 && (
        <button className="btn-ghost mt-3" onClick={() => setShown((n) => n + STEP)}>
          Show more ({rest} left)
        </button>
      )}
    </>
  );
}
