"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { scrapeNow } from "./actions";

/** Starts a run, then polls the worker and refreshes the page when it finishes. */
export function ScrapeButton({ reachable, running: initial }: { reachable: boolean; running: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(initial);
  const [starting, startRun] = useTransition();

  useEffect(() => {
    if (!running) return;
    const id = setInterval(async () => {
      try {
        const s = await (await fetch("/settings/run-status", { cache: "no-store" })).json();
        if (!s.running) {
          setRunning(false);
          router.refresh(); // show the finished run in the table
        }
      } catch {}
    }, 3_000);
    return () => clearInterval(id);
  }, [running, router]);

  const busy = running || starting;
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="btn"
        disabled={!reachable || busy}
        onClick={() =>
          startRun(async () => {
            await scrapeNow();
            setRunning(true);
          })
        }
      >
        {busy ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Checking courts… (~2 min)
          </>
        ) : (
          "Scrape & match now"
        )}
      </button>
      <span className="text-xs text-muted">
        {reachable ? "Also runs nightly at 00:30" : "⚠️ Worker not reachable"}
      </span>
    </div>
  );
}
