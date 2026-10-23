"use client";

import { useEffect, useState } from "react";

import { readConsent, saveConsent } from "@/shared/analytics/consent";

/**
 * Small cookie notice pinned to the bottom-left corner. Shown only until the
 * visitor chooses; the choice is remembered and forwarded to Clarity.
 */
export function CookieBanner() {
  // Rendered only after mount so the server and client agree on first paint.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (readConsent() === null) setOpen(true);
  }, []);

  if (!open) return null;

  const choose = (choice: "granted" | "denied") => {
    saveConsent(choice);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 z-[60] w-[calc(100vw-2rem)] max-w-xs rounded-xl border border-line bg-paper p-4 text-ink shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <p className="text-sm leading-relaxed text-ink-60 dark:text-zinc-300">
        We use cookies to understand how people use CTRL, so we can improve it.
        No ads, no selling data.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choose("granted")}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white transition hover:bg-ink/85 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => choose("denied")}
          className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink-60 transition hover:border-ink/40 hover:text-ink dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
