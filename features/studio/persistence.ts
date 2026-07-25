import type { BrainSource } from "@/lib/engine/simulation";
import type { VisualBrain } from "@/lib/authoring/types";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import { upgradePersistedBrain } from "@/lib/authoring/persistence";
import {
  CHALLENGES,
  challengeStorageKey,
  findChallenge,
} from "@/content/challenges";

/** Deterministic scaffold used during server render and initial hydration. */
export function scaffoldBrainFor(challengeId: string): VisualBrain {
  return decompileBrain(
    findChallenge(challengeId).scaffoldBrain as BrainSource,
  );
}

export function readStoredBrain(challengeId: string): VisualBrain | null {
  try {
    const stored = localStorage.getItem(challengeStorageKey(challengeId));
    return stored
      ? upgradePersistedBrain(
          JSON.parse(stored),
          scaffoldBrainFor(challengeId),
        )
      : null;
  } catch {
    return null;
  }
}

export function saveBrain(challengeId: string, brain: VisualBrain) {
  try {
    localStorage.setItem(
      challengeStorageKey(challengeId),
      JSON.stringify(brain),
    );
  } catch {
    // Storage is an enhancement; authoring still works when unavailable.
  }
}

export function readCompletedChallenges(): Set<string> {
  const completed = new Set<string>();
  for (const challenge of CHALLENGES) {
    try {
      if (localStorage.getItem(`ae-complete-${challenge.id}`) === "true") {
        completed.add(challenge.id);
      }
    } catch {
      return completed;
    }
  }
  return completed;
}
