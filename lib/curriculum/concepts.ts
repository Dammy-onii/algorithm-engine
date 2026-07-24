/**
 * The curriculum — Milestone 4.
 *
 * The progression itself is part of the product: each challenge introduces
 * exactly one new concept, and a concept only appears once its prerequisites are
 * met. This registry is the single source of truth for "what does this challenge
 * teach, and what must come before it".
 *
 * Framework-agnostic data + pure helpers. No React, no engine coupling.
 */

export interface Concept {
  id: string;
  /** Short display name, e.g. "Priority". */
  name: string;
  /** One-line, plain-English description of the idea. */
  teaches: string;
  /** The challenge that first teaches this concept. */
  taughtBy: string;
  /** Concepts that must be learned first. */
  prerequisites: string[];
}

/**
 * Ordered from simplest to most sophisticated. `taughtBy` uses challenge ids
 * (the `id` field inside each challenge JSON, e.g. "straight-line").
 */
export const CONCEPTS: Concept[] = [
  {
    id: "sequencing",
    name: "Instructions",
    teaches: "Give the robot a single rule: a condition and an action.",
    taughtBy: "straight-line",
    prerequisites: [],
  },
  {
    id: "conditions",
    name: "Conditions & priority",
    teaches: "Use several rules and let priority decide which one wins.",
    taughtBy: "one-corner",
    prerequisites: ["sequencing"],
  },
  {
    id: "compound-conditions",
    name: "Compound conditions",
    teaches: "Combine senses with AND / OR to handle trickier situations.",
    taughtBy: "dead-end",
    prerequisites: ["conditions"],
  },
  {
    id: "functions",
    name: "Reusable functions",
    teaches: "Compose your own multi-step brick and reuse it.",
    taughtBy: "snake-corridor",
    prerequisites: ["compound-conditions"],
  },
  {
    id: "state-machines",
    name: "State machines",
    teaches: "Give the robot modes so the same sense means different things.",
    taughtBy: "open-arena",
    prerequisites: ["functions"],
  },
];

export function conceptById(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}

/** The concept a given challenge teaches, if any. */
export function conceptForChallenge(challengeId: string): Concept | undefined {
  return CONCEPTS.find((c) => c.taughtBy === challengeId);
}

/**
 * A challenge is unlocked when every prerequisite *concept* has been learned —
 * i.e. the challenge that teaches each prerequisite has been completed. The
 * first challenge (no prerequisites) is always unlocked.
 */
export function isChallengeUnlocked(
  challengeId: string,
  completedChallengeIds: ReadonlySet<string>,
): boolean {
  const concept = conceptForChallenge(challengeId);
  if (!concept) return true; // challenge outside the curriculum → always open
  return concept.prerequisites.every((preId) => {
    const pre = conceptById(preId);
    return pre ? completedChallengeIds.has(pre.taughtBy) : true;
  });
}

/** Concepts considered mastered given the set of completed challenges. */
export function masteredConcepts(
  completedChallengeIds: ReadonlySet<string>,
): Concept[] {
  return CONCEPTS.filter((c) => completedChallengeIds.has(c.taughtBy));
}
