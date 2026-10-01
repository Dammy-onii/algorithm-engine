/**
 * Challenge registry — loads and exports the bundled learning challenges.
 *
 * Each challenge is a self-contained JSON file that includes the narrative,
 * scaffold brain, available bricks, and which world to load. Challenges are
 * fully local — no network requests, no backend.
 */

import { ChallengeData } from "@/lib/authoring/types";

import c1 from "./maze/01-straight-line.json";
import c2 from "./maze/02-one-corner.json";
import c3 from "./maze/03-dead-end.json";
import c4 from "./maze/04-snake-corridor.json";
import c10 from "./maze/10-branching-maze.json";
import c11 from "./finance/11-finance-basic-route.json";
import c12 from "./finance/12-finance-skip-offline.json";
import c13 from "./finance/13-finance-reliability-intro.json";
import c14 from "./finance/14-finance-route-selection.json";
import c15 from "./finance/15-finance-cost-and-reliability.json";
import c16 from "./finance/16-finance-provider-health.json";
import c20 from "./finance/20-finance-interview-routing.json";
import c21 from "./finance/21-finance-peak-hour-switch.json";
import c22 from "./finance/22-finance-production-orchestrator.json";
import c17 from "./parking/17-parking-first-shift.json";
import c18 from "./parking/18-parking-match-vehicle.json";
import c19 from "./parking/19-parking-priority-access.json";
import c23 from "./parking/23-parking-interview-controller.json";
import c24 from "./parking/24-parking-interview-operations.json";
import c25 from "./parking/25-parking-interview-orchestrator.json";
import c26 from "./drone/26-drone-first-sweep.json";
import c27 from "./drone/27-drone-cargo-run.json";
import c28 from "./decisions/28-decisions-even-odd.json";
import c29 from "./decisions/29-decisions-prime-sorter.json";
import c30 from "./decisions/30-decisions-fragile-parcels.json";

export const CHALLENGES: ChallengeData[] = [
  c1 as ChallengeData,
  c2 as ChallengeData,
  c3 as ChallengeData,
  c4 as ChallengeData,
  c10 as ChallengeData,
  c11 as ChallengeData,
  c12 as ChallengeData,
  c13 as ChallengeData,
  c14 as ChallengeData,
  c15 as ChallengeData,
  c16 as ChallengeData,
  c20 as ChallengeData,
  c21 as ChallengeData,
  c22 as ChallengeData,
  c17 as ChallengeData,
  c18 as ChallengeData,
  c19 as ChallengeData,
  c23 as ChallengeData,
  c24 as ChallengeData,
  c25 as ChallengeData,
  c26 as ChallengeData,
  c27 as ChallengeData,
  c28 as ChallengeData,
  c29 as ChallengeData,
  c30 as ChallengeData,
];

export function findChallenge(id: string): ChallengeData {
  return CHALLENGES.find((c) => c.id === id) ?? CHALLENGES[0];
}

/** localStorage key for a challenge's persisted VisualBrain. */
export function challengeStorageKey(challengeId: string): string {
  return `ae-brain-${challengeId}`;
}
