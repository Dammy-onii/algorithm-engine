import type { ChallengeData } from "@/lib/authoring/types";

export type DifficultyBand = "example" | "easy" | "medium" | "hard";

export interface DifficultyDefinition {
  id: DifficultyBand;
  title: string;
  constraint: string;
}

export const DIFFICULTIES: DifficultyDefinition[] = [
  {
    id: "example",
    title: "Examples",
    constraint:
      "Small, guided layouts that isolate one idea with a short, forgiving route.",
  },
  {
    id: "easy",
    title: "Easy",
    constraint:
      "A genuine navigation or operations problem: branching routes, at least one dead end, and several rules working together.",
  },
  {
    id: "medium",
    title: "Medium",
    constraint:
      "Multiple competing constraints such as capacity, energy, or state changes; a local rule is not enough.",
  },
  {
    id: "hard",
    title: "Hard",
    constraint:
      "Long-horizon planning, optimisation, or adversarial/continuous conditions with little scaffolding.",
  },
];

/** Map authored challenge metadata to the catalogue's presentation bands. */
export function difficultyFor(challenge: ChallengeData): DifficultyBand {
  if (challenge.stage === "practice") return "example";
  if (challenge.stage === "easy") return "easy";
  if (challenge.stage === "medium") return "medium";
  if (challenge.stage === "hard") return "hard";
  if (challenge.difficulty === 1) return "example";
  if (challenge.difficulty === 2) return "easy";
  if (challenge.difficulty === 3) return "medium";
  return "hard";
}
