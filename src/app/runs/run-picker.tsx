"use client";

import { useRouter } from "next/navigation";

export function RunPicker({ runs, selected }: { runs: { id: number; label: string }[]; selected: number }) {
  const router = useRouter();
  return (
    <label className="flex flex-col gap-1 text-sm">
      Run
      <select
        className="input"
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
