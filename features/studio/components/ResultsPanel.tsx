"use client";

/**
 * ResultsPanel — the post-run outcome screen. Replaces the terse "Goal reached"
 * note with a real summary: pass/fail, each objective (required + bonus stars),
 * a few run metrics, and an explicit "Next level" call to action so the learner
 * always knows what completing a challenge earned them and where to go next.
 */

import { ObjectiveResult } from "@/lib/authoring/objectives";

interface Props {
  status: "reached" | "stuck" | "out-of-energy" | "running";
  passed: boolean;
  results: ObjectiveResult[] | null;
  /** Present when a next challenge is available and unlocked. */
  onNext?: () => void;
  onRetry: () => void;
}

export function ResultsPanel({ status, passed, results, onNext, onRetry }: Props) {
  const required = (results ?? []).filter((r) => !r.bonus);
  const bonus = (results ?? []).filter((r) => r.bonus);
  const bonusMet = bonus.filter((r) => r.met).length;

  return (
    <div
      className={[
        "rounded-lg border p-4",
        passed
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-semibold">
          {passed ? "Challenge complete" : status === "stuck" ? "Stuck" : status === "out-of-energy" ? "Out of energy" : "Not passed yet"}
        </div>
        {bonus.length > 0 && (
          <div
            className={[
              "text-xs font-medium",
              passed ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400",
            ].join(" ")}
          >
            {bonusMet}/{bonus.length} bonus
          </div>
        )}
      </div>

      {results && results.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {[...required, ...bonus].map((r) => (
            <li key={r.id} className="flex items-start gap-2 text-sm">
              <span
                className={[
                  "mt-0.5 text-xs",
                  r.met
                    ? passed
                      ? "text-white dark:text-zinc-900"
                      : "text-zinc-900 dark:text-zinc-100"
                    : passed
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "text-zinc-300 dark:text-zinc-600",
                ].join(" ")}
              >
                {r.met ? (r.bonus ? "★" : "✓") : r.bonus ? "☆" : "○"}
              </span>
              <span
                className={
                  passed
                    ? "text-zinc-200 dark:text-zinc-700"
                    : "text-zinc-600 dark:text-zinc-400"
                }
              >
                {r.label}
                {r.bonus && (
                  <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
                    bonus
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2">
        {passed && onNext ? (
          <button
            onClick={onNext}
            className="flex-1 rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-transform hover:opacity-90 active:scale-[0.99] dark:bg-zinc-900 dark:text-zinc-100"
          >
            Next level →
          </button>
        ) : (
          <button
            onClick={onRetry}
            className={[
              "flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
              passed
                ? "bg-white/10 text-white hover:bg-white/20 dark:bg-zinc-900/10 dark:text-zinc-900"
                : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900",
            ].join(" ")}
          >
            {passed ? "Run again" : "Revise & run again"}
          </button>
        )}
      </div>
    </div>
  );
}
