"use client";

import { useState } from "react";

/** Read-only value with a Copy button (falls back to selecting the text). */
export function CopyField({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        className="input min-w-0 flex-1 font-mono text-xs"
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        type="button"
        className="btn-ghost flex-none"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
      >
        {copied ? "Copied ✓" : label}
      </button>
    </div>
  );
}
