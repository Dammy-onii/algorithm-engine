"use client";

/**
 * ChallengeSelector — the curriculum map (Milestone 4).
 *
 * A horizontal path of challenge cards, each showing the concept it teaches and
 * its state: completed, available, or locked. Locked challenges are dimmed and
 * cannot be selected until their prerequisite concept is learned — the
 * progression is part of the product, not a flat menu.
 *
 * Completion is passed in from the page (read from localStorage after mount) so
 * this component stays render-deterministic and hydration-safe.
 */

import { ChallengeData } from "@/lib/authoring/types";
import { conceptForChallenge, isChallengeUnlocked } from "@/lib/curriculum/concepts";
import { taxonomyFor } from "@/lib/authoring/challengeBrief";

interface Props {
  challenges: ChallengeData[];
  activeId: string;
  completedIds: Set<string>;
  onSelect: (id: string) => void;
}

export function ChallengeSelector({ challenges, activeId, completedIds, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {challenges.map((c) => {
        const active = c.id === activeId;
        const done = completedIds.has(c.id);
        const unlocked = isChallengeUnlocked(c.id, completedIds);
        const concept = conceptForChallenge(c.id);
        const locked = !unlocked && !done;
        const tax = taxonomyFor(c);

        return (
          <button
            key={c.id}
            onClick={() => !locked && onSelect(c.id)}
            disabled={locked}
            title={
              locked
                ? "Complete the previous challenge to unlock this one"
                : concept
                  ? `Teaches: ${concept.teaches}`
                  : undefined
            }
            className={[
              "flex min-w-[176px] flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
              locked
                ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-55 dark:border-zinc-800 dark:bg-zinc-900/40"
                : active
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={[
                  "text-[11px] font-semibold uppercase tracking-wide",
                  active && !locked ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-400",
                ].join(" ")}
              >
                {tax.badge}
              </span>
              {done ? (
                <span
                  className={[
                    "text-xs font-semibold",
                    active ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-100",
                  ].join(" ")}
                  title="Completed"
                >
                  ✓
                </span>
              ) : locked ? (
                <LockIcon />
              ) : null}
            </div>

            <span className="text-sm font-medium leading-tight">
              {c.number}. {c.name}
            </span>

            {concept && (
              <span
                className={[
                  "text-xs leading-tight",
                  active && !locked ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500",
                ].join(" ")}
              >
                {locked ? "Locked" : `Learn: ${concept.name}`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
