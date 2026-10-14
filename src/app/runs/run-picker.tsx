"use client";

import { useRouter } from "next/navigation";

export function RunPicker({ runs, selected }: { runs: { id: number; label: string }[]; selected: number }) {
  const router = useRouter();
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold tracking-widest text-muted uppercase">
      Run
      <select
        className="input min-w-64 text-sm font-medium tracking-normal text-foreground normal-case"
        value={selected}
        onChange={(e) => router.push(`/runs?run=${e.target.value}`)}
      >
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}
