"use client";

/**
 * ProblemBrief — the problem statement, layered so it is never a wall of text.
 *
 * Always visible: a taxonomy badge, the one-line headline (what to do) and a
 * line of scenario context. Everything longer — the narrative, the intelligence
 * notes, what it teaches — lives behind "Learn more". Hints live in their own
 * drawer and escalate one at a time, nudged open after repeated failed runs.
 *
 * Driven entirely by the normalized brief, so maze, warehouse and finance
 * challenges all render the same flow.
 */

import { useState } from "react";
import { ChallengeData } from "@/lib/authoring/types";
import { normalizeBrief, taxonomyFor } from "@/lib/authoring/challengeBrief";

interface Props {
  challenge: ChallengeData;
  /** Failed-run count on this challenge — nudges the hints drawer open. */
  attempts: number;
}

export function ProblemBrief({ challenge, attempts }: Props) {
  const brief = normalizeBrief(challenge);
  const tax = taxonomyFor(challenge);
  const [showDetail, setShowDetail] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);

  const nudge = attempts >= 2 && revealedHints === 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Badge + title */}
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
          {tax.badge}
        </span>
        <span className="text-[11px] font-medium text-zinc-400">
          {challenge.number}. {challenge.name}
        </span>
      </div>

      {/* Headline — what to do (always visible) */}
      <h2 className="mt-2 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
        {brief.headline}
      </h2>
      {/* One line of scenario framing */}
      <p className="mt-1 text-sm leading-relaxed text-zinc-500">{brief.context}</p>

      {/* Learn more — the prose, revealed on demand */}
      {(brief.detail.length > 0 || brief.learn) && (
        <div className="mt-3">
          <button
            onClick={() => setShowDetail((s) => !s)}
            className="text-xs font-medium text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
            aria-expanded={showDetail}
          >
            {showDetail ? "Hide background" : "Learn more"}
          </button>
          {showDetail && (
            <div className="mt-2 flex flex-col gap-2 border-l-2 border-zinc-200 pl-3 dark:border-zinc-700">
              {brief.detail.map((para, i) => (
                <p key={i} className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {para}
                </p>
              ))}
              {brief.learn && (
                <p className="text-xs text-zinc-500">
                  <span className="font-semibold uppercase tracking-wide text-zinc-400">
                    Teaches ·{" "}
                  </span>
                  {brief.learn}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hints drawer */}
      {brief.hints.length > 0 && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {revealedHints > 0 && (
            <div className="mb-2 flex flex-col gap-2">
              {brief.hints.slice(0, revealedHints).map((h, i) => (
                <div
                  key={i}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <span className="font-medium text-zinc-500">
                    Hint {brief.hints.length > 1 ? `${i + 1} · ` : "· "}
                  </span>
                  {h}
                </div>
              ))}
            </div>
          )}
          {revealedHints < brief.hints.length && (
            <button
              onClick={() => setRevealedHints((n) => n + 1)}
              className={[
                "text-xs font-medium underline-offset-2 transition-colors hover:underline",
                nudge
                  ? "text-zinc-700 dark:text-zinc-200"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
              ].join(" ")}
            >
              {revealedHints === 0
                ? nudge
                  ? "Stuck? Show a hint"
                  : "Show a hint"
                : "Show another hint"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
