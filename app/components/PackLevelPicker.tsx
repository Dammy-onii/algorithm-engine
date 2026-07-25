"use client";

import { ChallengeData } from "@/lib/authoring/types";

export type DifficultyBand = "example" | "easy" | "medium" | "hard";

const DIFFICULTIES: { id: DifficultyBand; title: string; constraint: string }[] = [
  { id: "example", title: "Examples", constraint: "Small, guided layouts that isolate one idea with a short, forgiving route." },
  { id: "easy", title: "Easy", constraint: "A genuine navigation or operations problem: branching routes, at least one dead end, and several rules working together." },
  { id: "medium", title: "Medium", constraint: "Multiple competing constraints such as capacity, energy, or state changes; a local rule is not enough." },
  { id: "hard", title: "Hard", constraint: "Long-horizon planning, optimisation, or adversarial/continuous conditions with little scaffolding." },
];

export function difficultyFor(challenge: ChallengeData): DifficultyBand {
  if (challenge.stage === "practice" || challenge.difficulty === 1) return "example";
  if (challenge.stage === "easy" || challenge.difficulty === 2) return "easy";
  if (challenge.stage === "medium" || challenge.difficulty === 3) return "medium";
  return "hard";
}

interface Props {
  packId: string;
  packTitle: string;
  challenges: ChallengeData[];
  onSelect: (challengeId: string) => void;
}

/** A world-level directory. Difficulty is explicit product guidance, not an engine rule. */
export function PackLevelPicker({ packId, packTitle, challenges, onSelect }: Props) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-4 sm:py-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{packTitle} world</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Choose a level</h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Levels are grouped by the kind of reasoning they require. Difficulty reflects
          the constraints below, not just the size of the grid.
        </p>
      </div>

      {DIFFICULTIES.map((difficulty) => {
        const levels = challenges.filter((challenge) => difficultyFor(challenge) === difficulty.id);
        return (
          <section key={difficulty.id} aria-labelledby={`${packId}-${difficulty.id}`}>
            <div className="border-b border-zinc-200 pb-2 dark:border-zinc-800">
              <h3 id={`${packId}-${difficulty.id}`} className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{difficulty.title}</h3>
              <p className="mt-1 max-w-3xl text-sm text-zinc-500">Constraint: {difficulty.constraint}</p>
            </div>
            {levels.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {levels.map((challenge) => (
                  <button
                    key={challenge.id}
                    onClick={() => onSelect(challenge.id)}
                    className="flex min-h-40 flex-col items-start rounded-xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-500"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Level {challenge.number}</span>
                    <span className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{challenge.name}</span>
                    <span className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{challenge.tagline}</span>
                    <span className="mt-auto pt-4 text-xs font-semibold text-zinc-900 dark:text-zinc-100">Open Studio →</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-400">No {difficulty.title.toLowerCase()} levels in this world yet.</p>
            )}
          </section>
        );
      })}
    </section>
  );
}
