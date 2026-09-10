"use client";

/**
 * ProgressStepper — a compact, always-visible "where am I" indicator: the pack
 * name, position (Level X of N), and completed count.
 */

import { ChallengeData } from "@/lib/authoring/types";

interface Props {
  challenges: ChallengeData[];
  activeId: string;
  completedIds: Set<string>;
  packTitle: string;
}

export function ProgressStepper({ challenges, activeId, completedIds, packTitle }: Props) {
  const index = challenges.findIndex((challenge) => challenge.id === activeId);
  const doneCount = challenges.filter((challenge) =>
    completedIds.has(challenge.id),
  ).length;

  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        {packTitle}
      </span>
      <span className="text-[11px] text-zinc-400">
        {index >= 0
          ? `Level ${index + 1} of ${challenges.length}`
          : `${challenges.length} levels`}
        {" · "}
        {doneCount} done
      </span>
    </div>
  );
}
