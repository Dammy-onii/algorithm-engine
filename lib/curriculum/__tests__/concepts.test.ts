/**
 * Curriculum progression (Milestone 4).
 */

import { describe, expect, it } from "vitest";

import {
  CONCEPTS,
  conceptForChallenge,
  isChallengeUnlocked,
  masteredConcepts,
} from "../concepts";
import { CHALLENGES } from "@/content/challenges";

describe("curriculum registry", () => {
  it("every concept is taught by a real challenge", () => {
    const ids = new Set(CHALLENGES.map((c) => c.id));
    for (const concept of CONCEPTS) {
      expect(ids, `concept ${concept.id}`).toContain(concept.taughtBy);
    }
  });

  it("every challenge maps to exactly one concept", () => {
    for (const c of CHALLENGES) {
      expect(conceptForChallenge(c.id), `challenge ${c.id}`).toBeDefined();
    }
  });

  it("prerequisites reference concepts that exist", () => {
    const ids = new Set(CONCEPTS.map((c) => c.id));
    for (const concept of CONCEPTS) {
      for (const pre of concept.prerequisites) {
        expect(ids).toContain(pre);
      }
    }
  });
});

describe("progression gating", () => {
  it("the first challenge is always unlocked", () => {
    expect(isChallengeUnlocked("straight-line", new Set())).toBe(true);
  });

  it("later challenges are locked until prerequisites are completed", () => {
    const none = new Set<string>();
    expect(isChallengeUnlocked("one-corner", none)).toBe(false);
    expect(isChallengeUnlocked("dead-end", none)).toBe(false);

    const afterFirst = new Set(["straight-line"]);
    expect(isChallengeUnlocked("one-corner", afterFirst)).toBe(true);
    expect(isChallengeUnlocked("dead-end", afterFirst)).toBe(false);
  });

  it("completing the chain unlocks the whole path in order", () => {
    const done = new Set<string>();
    const order = [
      "straight-line", "one-corner", "dead-end", "snake-corridor", "branching-maze",
      "finance-basic-route", "finance-skip-offline", "finance-reliability-intro",
      "finance-route-selection", "finance-cost-and-reliability", "finance-provider-health",
      "finance-interview-routing", "finance-peak-hour-switch",
      "finance-production-orchestrator",
      "parking-first-shift", "parking-match-vehicle", "parking-priority-access",
      "parking-interview-controller", "parking-interview-operations",
      "parking-interview-orchestrator",
      "drone-first-sweep",
      "drone-cargo-run",
      "decisions-even-odd",
      "decisions-prime-sorter",
      "decisions-fragile-parcels",
      "warehouse-load-the-truck",
    ];
    for (const id of order) {
      expect(isChallengeUnlocked(id, done), `expected ${id} unlocked`).toBe(true);
      done.add(id);
    }
    expect(masteredConcepts(done)).toHaveLength(CONCEPTS.length);
  });
});
