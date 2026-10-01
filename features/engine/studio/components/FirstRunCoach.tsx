"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ae-first-run-coach-v1";

/** Small in-context orientation shown alongside the full-screen guide. */
export function FirstRunCoach() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "complete") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(false);
      }
    } catch {
      // The coach remains dismissible for this session.
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "complete");
    } catch {
      // Session-only dismissal is still useful.
    }
  };

  return (
    <aside className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-zinc-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-zinc-200">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-3">
          <CoachStep
            number="1"
            title="Understand the mission"
            detail="Read the complete problem statement, then scroll down to the solution tools."
          />
          <CoachStep
            number="2"
            title="Build the decision"
            detail="Start in Policy → Rules. Conditions and Functions explain the vocabulary you can reuse."
          />
          <CoachStep
            number="3"
            title="Run and inspect"
            detail="Apply & Run starts a clean simulation. Inspect the selected rule, system response, and result."
          />
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss workspace introduction"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg text-zinc-400 hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          ×
        </button>
      </div>
      <p className="mt-2 text-[10px] text-emerald-800/70 dark:text-emerald-300/70">
        Need the complete explanation later? Open Guide in the header.
      </p>
    </aside>
  );
}

function CoachStep({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-2 rounded-lg border border-emerald-200/70 bg-white/70 p-2.5 dark:border-emerald-900/60 dark:bg-zinc-900/50">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
        {number}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          {detail}
        </span>
      </span>
    </div>
  );
}
