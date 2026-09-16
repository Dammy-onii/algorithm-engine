/**
 * Content registry (Tier 1 of the content-pack architecture).
 *
 * The single source of truth for "what content exists": the catalog of simulation
 * packs and the challenges inside each. The rest of the app talks to this API
 * instead of importing the challenge array or guessing packs from id prefixes.
 *
 * Backend today: the bundled `CHALLENGES` array. The API is shaped so the backend
 * can later become a local or remote `fetch` (see docs/CONTENT_ARCHITECTURE.md)
 * without changing callers.
 */

import { ChallengeData } from "@/lib/authoring/types";
import { CHALLENGES, findChallenge } from "@/content/challenges";

/** Descriptor for a simulation pack (world type) shown in the world picker. */
export interface PackInfo {
  id: string;
  /** Small label above the title on the picker card. */
  eyebrow: string;
  title: string;
  description: string;
  /** Call-to-action text on the picker card. */
  action: string;
}

/**
 * The pack catalog. In a later tier this comes from `content/index.json` +
 * per-pack `manifest.json`; for now it is the shipped set of known packs.
 */
export const PACKS: PackInfo[] = [
  {
    id: "maze",
    eyebrow: "Navigation curriculum",
    title: "Maze",
    description:
      "Learn rules, conditions, reusable functions, and state machines by navigating increasingly complex routes.",
    action: "Explore maze levels",
  },
  {
    id: "finance",
    eyebrow: "Payments curriculum",
    title: "Finance",
    description:
      "Author the decision layer inside a payment system: route each transaction by cost, reliability, and live provider health.",
    action: "Explore payment routing",
  },
  {
    id: "parking",
    eyebrow: "Facility operations curriculum",
    title: "Parking",
    description:
      "Operate a smart parking facility: allocate arrivals, match vehicle requirements, and protect priority access as spaces turn over.",
    action: "Explore parking operations",
  },
  {
    id: "drone",
    eyebrow: "Autonomous search curriculum",
    title: "Drone Surveillance",
    description:
      "Write the autonomy for a search drone: sweep an area it has never seen, detect the target, close in on it, and report the find before the battery runs out.",
    action: "Explore drone missions",
  },
];

/** All packs in catalog order. */
export function listPacks(): PackInfo[] {
  return PACKS;
}

export function findPack(packId: string): PackInfo | undefined {
  return PACKS.find((p) => p.id === packId);
}

/** The pack a challenge belongs to (falls back to the first pack). */
export function packForChallenge(challengeId: string): string {
  return findChallenge(challengeId).pack ?? PACKS[0].id;
}

/** Challenges in a pack, in authored order. */
export function challengesInPack(packId: string): ChallengeData[] {
  return CHALLENGES.filter((c) => (c.pack ?? PACKS[0].id) === packId);
}

/** Look up a single challenge by id. Unlike the legacy editor helper, this does
 * not fall back to the first challenge, so server routes can reject bad URLs. */
export function getChallenge(id: string): ChallengeData | undefined {
  return CHALLENGES.find((challenge) => challenge.id === id);
}

/** The first challenge of a pack (a Studio fallback when no challenge URL is supplied). */
export function firstChallengeInPack(packId: string): ChallengeData | undefined {
  return challengesInPack(packId)[0];
}
