/**
 * Challenge registry — loads and exports all five Milestone 2 challenges.
 *
 * Each challenge is a self-contained JSON file that includes the narrative,
 * scaffold brain, available bricks, and which world to load. Challenges are
 * fully local — no network requests, no backend.
 */

import { ChallengeData } from "@/lib/authoring/types";

import c1 from "./01-straight-line.json";
import c2 from "./02-one-corner.json";
import c3 from "./03-dead-end.json";
import c4 from "./04-snake-corridor.json";
import c5 from "./05-open-arena.json";

export const CHALLENGES: ChallengeData[] = [
  c1 as ChallengeData,
  c2 as ChallengeData,
  c3 as ChallengeData,
  c4 as ChallengeData,
  c5 as ChallengeData,
];

export function findChallenge(id: string): ChallengeData {
  return CHALLENGES.find((c) => c.id === id) ?? CHALLENGES[0];
}

/** localStorage key for a challenge's persisted VisualBrain. */
export function challengeStorageKey(challengeId: string): string {
  return `ae-brain-${challengeId}`;
}
