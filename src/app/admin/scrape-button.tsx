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
        const s = await (await fetch("/admin/run-status", { cache: "no-store" })).json();
        if (!s.running) {
          setRunning(false);
          router.refresh(); // show the finished run in the table
        }
      } catch {}
    }, 3_000);
    return () => clearInterval(id);
  }, [running, router]);

  return (
    <div className="mb-3 flex items-center gap-3">
      <button
        className="btn"
        disabled={!reachable || running || starting}
        onClick={() =>
          startRun(async () => {
            await scrapeNow();
            setRunning(true);
          })
        }
      >
        {running || starting ? "Running… (takes ~2 min)" : "Scrape & match now"}
      </button>
      <span className="text-sm text-muted">
        {reachable ? "Also runs daily at 00:30." : "⚠️ Worker not reachable."}
      </span>
    </div>
  );
}
