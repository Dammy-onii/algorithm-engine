"use client";

/**
 * ProgressStepper — a compact, always-visible "where am I" indicator: the pack
 * name, position (Level X of N), and a dotted track marking done / current /
 * locked challenges. Complements the fuller ChallengeSelector without taking its
 * space, so a learner never loses the thread of the journey.
 */

import { ChallengeData } from "@/lib/authoring/types";
import { isChallengeUnlocked } from "@/lib/curriculum/concepts";

interface Props {
  challenges: ChallengeData[];
  activeId: string;
  completedIds: Set<string>;
  packTitle: string;
}

export function ProgressStepper({ challenges, activeId, completedIds, packTitle }: Props) {
  const index = challenges.findIndex((c) => c.id === activeId);
  const doneCount = challenges.filter((c) => completedIds.has(c.id)).length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {packTitle}
        </span>
        <span className="text-[11px] text-zinc-400">
          {index >= 0 ? `Level ${index + 1} of ${challenges.length}` : `${challenges.length} levels`}
          {" · "}
          {doneCount} done
        </span>
      </div>
      <div className="flex flex-1 items-center gap-1">
        {challenges.map((c) => {
          const done = completedIds.has(c.id);
          const active = c.id === activeId;
          const locked = !isChallengeUnlocked(c.id, completedIds) && !done;
          return (
            <span
              key={c.id}
              title={`${c.number}. ${c.name}`}
              className={[
                "h-1.5 flex-1 rounded-full transition-colors",
                active
                  ? "bg-zinc-900 dark:bg-zinc-100"
                  : done
                    ? "bg-zinc-400 dark:bg-zinc-500"
                    : locked
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "bg-zinc-200 dark:bg-zinc-700",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
