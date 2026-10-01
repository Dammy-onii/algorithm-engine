"use client";

import { useEffect } from "react";

import type { Concept } from "@/lib/curriculum/concepts";

interface Props {
  concept: Concept;
  /** Present when the next challenge in the pack is unlocked. */
  onNext?: () => void;
  onClose: () => void;
}

/** Celebratory pop-up shown the first time a challenge is passed. */
export function LearnedDialog({ concept, onNext, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="learned-dialog-title"
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-2xl dark:border-zinc-800 dark:bg-[#181818]"
      >
        <div
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        >
          ✓
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          You just learned
        </p>
        <h2
          id="learned-dialog-title"
          className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {concept.name}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {concept.teaches}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          {onNext && (
            <button
              type="button"
              autoFocus
              onClick={onNext}
              className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Next challenge
            </button>
          )}
          <button
            type="button"
            autoFocus={!onNext}
            onClick={onClose}
            className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {onNext ? "Stay here" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
