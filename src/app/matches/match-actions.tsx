"use client";

import { useState, useTransition } from "react";
import { Avatar, Icon } from "../ui";
import { markBooked, toggleIn, undoBooking } from "./actions";

/** "I'm in" / "I booked it" bar under a live match card. */
export function MatchActions({
  matchKey,
  inNames,
  iAmIn,
  minPlayers,
  isFriend,
  peakzLink,
}: {
  matchKey: string;
  inNames: string[];
  iAmIn: boolean;
  minPlayers: number;
  isFriend: boolean;
  peakzLink: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ready = inNames.length >= minPlayers;
  const run = (fn: () => Promise<string | null>) =>
    start(async () => setError(await fn()));

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {inNames.length > 0 ? (
          <>
            <span className="flex -space-x-1.5">
              {inNames.map((n) => (
                <Avatar key={n} name={n} size="h-6 w-6 text-[10px]" />
              ))}
            </span>
            <span className="truncate">
              <strong>{inNames.length}</strong>
              <span className="text-muted">/{minPlayers} in: {inNames.join(", ")}</span>
            </span>
          </>
        ) : (
          <span className="text-muted">Nobody’s in yet.</span>
        )}
        {ready && <span className="chip bg-lime/30 text-lime-ink dark:text-lime">Ready: book it!</span>}
      </div>

      {isFriend && (
        <div className="flex items-center gap-2">
          <button
            className={iAmIn ? "btn-ghost" : "btn"}
            disabled={pending}
            onClick={() => run(() => toggleIn(matchKey))}
          >
            {iAmIn ? "I’m out" : "I’m in"}
          </button>
          {ready && iAmIn && (
            <button
              className="btn-lime"
              disabled={pending}
              title={`Book it on Peakz first (${peakzLink}), then tap this so nobody books twice.`}
              onClick={() => {
                if (confirm("Did you book this court on Peakz? Everyone who’s in gets a notification.")) {
                  run(() => markBooked(matchKey));
                }
              }}
            >
              <Icon name="check" /> I booked it
            </button>
          )}
        </div>
      )}
      {error && <p className="w-full text-danger">{error}</p>}
    </div>
  );
}

/** Buttons on an upcoming (booked) game. */
export function BookedActions({
  matchKey,
  iAmIn,
  isFriend,
  canUndo,
  icsHref,
}: {
  matchKey: string;
  iAmIn: boolean;
  isFriend: boolean;
  canUndo: boolean;
  icsHref: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<string | null>) => start(async () => setError(await fn()));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a className="btn-ghost no-underline" href={icsHref}>
        <Icon name="calendar" /> Add to calendar
      </a>
      {isFriend && (
        <button className="btn-ghost" disabled={pending} onClick={() => run(() => toggleIn(matchKey))}>
          {iAmIn ? "I can’t make it" : "I’m in too"}
        </button>
      )}
      {canUndo && (
        <button
          className="btn-danger"
          disabled={pending}
          onClick={() => {
            if (confirm("Undo this booking? (Cancel it on Peakz too if needed.)")) run(() => undoBooking(matchKey));
          }}
        >
          Undo booking
        </button>
      )}
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
