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
    name: "Conditions & rule order",
    teaches: "Use several rules and let the first matching safe rule win.",
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
    id: "maze-navigation",
    name: "Maze navigation",
    teaches: "Use wall observations and ordered rules to navigate branches and dead ends.",
    taughtBy: "branching-maze",
    prerequisites: ["functions"],
  },
  {
    id: "payment-routing",
    name: "Payment routing",
    teaches: "Route each payment through the cheapest available provider.",
    taughtBy: "finance-basic-route",
    // First level of a separate world track — open from the start.
    prerequisites: [],
  },
  {
    id: "provider-availability",
    name: "Provider availability",
    teaches: "Skip offline providers and route only where a payment can succeed.",
    taughtBy: "finance-skip-offline",
    prerequisites: ["payment-routing"],
  },
  {
    id: "expected-cost",
    name: "Expected cost",
    teaches: "Weigh fee against failure risk — route by expected cost, not sticker price.",
    taughtBy: "finance-reliability-intro",
    prerequisites: ["provider-availability"],
  },
  {
    id: "route-constraints",
    name: "Constrained routing",
    teaches: "Apply an availability constraint, then a cost preference, across many options.",
    taughtBy: "finance-route-selection",
    prerequisites: ["expected-cost"],
  },
  {
    id: "weighted-routing",
    name: "Weighted routing",
    teaches: "Minimize a combined cost function over competing objectives.",
    taughtBy: "finance-cost-and-reliability",
    prerequisites: ["route-constraints"],
  },
  {
    id: "adaptive-routing",
    name: "Adaptive routing",
    teaches: "Re-decide every tick from live state as provider health changes.",
    taughtBy: "finance-provider-health",
    prerequisites: ["weighted-routing"],
  },
  {
    id: "resilient-orchestration",
    name: "Resilient payment orchestration",
    teaches: "Combine eligibility, deadlines, capacity, reliability, and retry history in a policy that generalizes.",
    taughtBy: "finance-interview-routing",
    prerequisites: ["adaptive-routing"],
  },
  {
    id: "load-aware-routing",
    name: "Load-aware payment routing",
    teaches: "Control congestion and protect service levels while provider work continues asynchronously.",
    taughtBy: "finance-peak-hour-switch",
    prerequisites: ["resilient-orchestration"],
  },
  {
    id: "production-orchestration",
    name: "Production payment orchestration",
    teaches: "Balance throughput, reliability, deadlines, retries, compatibility, congestion, and cost under adversarial incidents.",
    taughtBy: "finance-production-orchestrator",
    prerequisites: ["load-aware-routing"],
  },
  {
    id: "parking-operations",
    name: "Parking operations",
    teaches: "Allocate arriving vehicles while occupied spaces turn over and become reusable.",
    taughtBy: "parking-first-shift",
    prerequisites: [],
  },
  {
    id: "parking-resource-matching",
    name: "Resource matching",
    teaches: "Match vehicle requirements to compatible parking resources before using the general fallback.",
    taughtBy: "parking-match-vehicle",
    prerequisites: ["parking-operations"],
  },
  {
    id: "parking-priority-allocation",
    name: "Priority allocation",
    teaches: "Protect reservations, accessible spaces, and premium access with ordered special cases.",
    taughtBy: "parking-priority-access",
    prerequisites: ["parking-resource-matching"],
  },
  {
    id: "parking-realtime-control",
    name: "Real-time parking control",
    teaches: "Coordinate arrivals, physical movements, departures, patience, and reusable capacity in one live control loop.",
    taughtBy: "parking-interview-controller",
    prerequisites: ["parking-priority-allocation"],
  },
  {
    id: "parking-incident-recovery",
    name: "Parking incident recovery",
    teaches: "Control back-pressure and fairness while closures, congestion, and gate capacity change.",
    taughtBy: "parking-interview-operations",
    prerequisites: ["parking-realtime-control"],
  },
  {
    id: "parking-production-orchestration",
    name: "Production parking orchestration",
    teaches: "Maintain safety, throughput, fairness, and state consistency through overlapping long-running incidents.",
    taughtBy: "parking-interview-orchestrator",
    prerequisites: ["parking-incident-recovery"],
  },
  {
    id: "autonomous-search",
    name: "Autonomous search",
    teaches:
      "Sweep unknown ground, then switch from searching to closing in once a target is detected.",
    taughtBy: "drone-first-sweep",
    // First level of a separate world track — open from the start.
    prerequisites: [],
  },
  {
    id: "constrained-recovery",
    name: "Constrained recovery",
    teaches:
      "Choose which weighted, valued items to carry (a knapsack choice) and route them home under a battery budget.",
    taughtBy: "drone-cargo-run",
    prerequisites: ["autonomous-search"],
  },
  {
    id: "number-facts",
    name: "Number facts",
    teaches: "Use a fact about a number (even or odd) to choose between two outcomes.",
    taughtBy: "decisions-even-odd",
    // First level of a separate world track — open from the start.
    prerequisites: [],
  },
  {
    id: "choosing-the-right-fact",
    name: "Choosing the right fact",
    teaches: "Decide with the fact that answers the question (prime), not one that only looks similar (odd).",
    taughtBy: "decisions-prime-sorter",
    prerequisites: ["number-facts"],
  },
  {
    id: "if-otherwise",
    name: "If / otherwise",
    teaches: "Make a yes/no decision: one rule for the special case, a fallback for everything else.",
    taughtBy: "decisions-fragile-parcels",
    prerequisites: ["choosing-the-right-fact"],
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
