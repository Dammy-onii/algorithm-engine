/**
 * Challenge registry — loads and exports the bundled learning challenges.
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
import c6 from "./06-warehouse-first-delivery.json";
import c7 from "./07-warehouse-package-sorting.json";
import c8 from "./08-warehouse-continuous-operations.json";
import c9 from "./09-warehouse-energy-management.json";
import c10 from "./10-branching-maze.json";
import c11 from "./11-finance-basic-route.json";
import c12 from "./12-finance-skip-offline.json";
import c13 from "./13-finance-reliability-intro.json";
import c14 from "./14-finance-route-selection.json";
import c15 from "./15-finance-cost-and-reliability.json";
import c16 from "./16-finance-provider-health.json";

export const CHALLENGES: ChallengeData[] = [
  c1 as ChallengeData,
  c2 as ChallengeData,
  c3 as ChallengeData,
  c4 as ChallengeData,
  c5 as ChallengeData,
  c6 as ChallengeData,
  c7 as ChallengeData,
  c8 as ChallengeData,
  c9 as ChallengeData,
  c10 as ChallengeData,
  c11 as ChallengeData,
  c12 as ChallengeData,
  c13 as ChallengeData,
  c14 as ChallengeData,
  c15 as ChallengeData,
  c16 as ChallengeData,
];

export function findChallenge(id: string): ChallengeData {
  return CHALLENGES.find((c) => c.id === id) ?? CHALLENGES[0];
}

/** localStorage key for a challenge's persisted VisualBrain. */
export function challengeStorageKey(challengeId: string): string {
  return `ae-brain-${challengeId}`;
}
