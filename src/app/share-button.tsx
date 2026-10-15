"use client";

import { Icon } from "./ui";

/** Native share sheet on phones (WhatsApp etc.); WhatsApp Web elsewhere. */
export function ShareButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="btn-ghost !px-2.5"
      title="Share"
      aria-label="Share"
      onClick={async () => {
        if (navigator.share) {
          try {
            await navigator.share({ text });
            return;
          } catch (e) {
            if ((e as Error).name === "AbortError") return; // user closed the sheet
          }
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      }}
    >
      <Icon name="share" />
    </button>
  );
}
