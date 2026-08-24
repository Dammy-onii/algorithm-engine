/**
 * Content registry (Tier 1) — the catalog API that groups challenges into packs.
 */

import { describe, expect, it } from "vitest";

import {
  listPacks,
  challengesInPack,
  packForChallenge,
  firstChallengeInPack,
  getChallenge,
} from "../registry";
import { CHALLENGES } from "@/content/challenges";
import { findWorld } from "@/lib/content/datasets";
import { BUILTIN_FLAGS } from "@/lib/engine/decision/condition";
import { resolveWorldModule } from "@/lib/engine/worlds/registry";

describe("content registry", () => {
  it("keeps every interview number unique across the complete registry", () => {
    for (const interview of CHALLENGES.filter(
      (challenge) => challenge.interviewEvaluation,
    )) {
      expect(
        CHALLENGES.filter(
          (challenge) => challenge.number === interview.number,
        ),
        interview.id,
      ).toHaveLength(1);
    }
  });

  it("lists the known packs", () => {
    const ids = listPacks().map((p) => p.id);
    expect(ids).toContain("maze");
    expect(ids).toContain("finance");
    expect(ids).toContain("parking");
  });

  it("every challenge declares a pack that exists in the catalog", () => {
    const packIds = new Set(listPacks().map((p) => p.id));
    for (const c of CHALLENGES) {
      expect(packIds, `challenge ${c.id} → pack ${c.pack}`).toContain(c.pack);
    }
  });

  it("groups challenges by pack with no overlap and full coverage", () => {
    const all = listPacks().flatMap((p) => challengesInPack(p.id).map((c) => c.id));
    // Disjoint — every challenge appears under exactly one pack.
    expect(new Set(all).size).toBe(all.length);
    // Complete — every challenge is covered by some pack.
    expect(all.length).toBe(CHALLENGES.length);
  });

  it("resolves the pack for a challenge and the first challenge of a pack", () => {
    const first = firstChallengeInPack("finance");
    expect(first).toBeDefined();
    expect(packForChallenge(first!.id)).toBe("finance");
    expect(getChallenge(first!.id)?.id).toBe(first!.id);
    expect(getChallenge("not-a-real-challenge")).toBeUndefined();
  });

  it("does not publish the removed Maze level 5", () => {
    expect(
      challengesInPack("maze").some((challenge) => challenge.id === "open-arena"),
    ).toBe(false);
    expect(getChallenge("open-arena")).toBeUndefined();
  });

  it("publishes a complete learner brief for every challenge", () => {
    for (const challenge of CHALLENGES) {
      expect(challenge.brief?.trim(), `${challenge.id} brief`).toBeTruthy();
      expect(challenge.context?.trim(), `${challenge.id} context`).toBeTruthy();
      expect(challenge.narrative.trim(), `${challenge.id} narrative`).toBeTruthy();
      expect(
        challenge.intelligenceExplanation.trim(),
        `${challenge.id} intelligence explanation`,
      ).toBeTruthy();
      expect(challenge.learningObjective.trim(), `${challenge.id} learning objective`).toBeTruthy();
      expect(challenge.steps?.length, `${challenge.id} task steps`).toBeGreaterThan(0);
      expect(challenge.hints?.length, `${challenge.id} staged hints`).toBeGreaterThan(0);
      expect(challenge.taxonomy?.domain, `${challenge.id} taxonomy domain`).toBeTruthy();
      expect(challenge.taxonomy?.simulation, `${challenge.id} taxonomy simulation`).toBeTruthy();
      expect(challenge.taxonomy?.tier, `${challenge.id} taxonomy tier`).toBeTruthy();
      expect(challenge.taxonomy?.grade, `${challenge.id} taxonomy grade`).toBeGreaterThan(0);
    }
  });

  it("keeps catalogue stage and problem taxonomy aligned", () => {
    for (const challenge of CHALLENGES) {
      const expectedTier =
        challenge.stage === "practice" ? "tutorial" : challenge.stage;
      expect(
        challenge.taxonomy?.tier,
        `${challenge.id} stage/taxonomy`,
      ).toBe(expectedTier);
    }
  });

  it("does not teach the retired numeric-priority execution model", () => {
    const retiredWording =
      /\bpriority\s+\d|high-priority|higher priority|top-priority|priority above|priorities above|outrank movement/i;
    for (const challenge of CHALLENGES) {
      const learnerText = [
        challenge.tagline,
        challenge.brief,
        challenge.context,
        challenge.narrative,
        challenge.objective,
        challenge.learningObjective,
        challenge.intelligenceExplanation,
        challenge.hint,
        ...(challenge.hints ?? []),
        ...(challenge.steps ?? []).flatMap((step) => [step.label, step.hint ?? ""]),
        ...(challenge.objectives ?? []).map((objective) => objective.label),
      ].join("\n");
      expect(learnerText, `${challenge.id} learner wording`).not.toMatch(
        retiredWording,
      );
    }
  });

  it("only exposes conditions supplied by the selected world module", () => {
    for (const challenge of CHALLENGES) {
      const world = findWorld(challenge.worldKey).source.world;
      const worldModule = resolveWorldModule(world.kind);
      const vocabulary = new Set([
        ...BUILTIN_FLAGS,
        ...worldModule.domainFlags.map((flag) => flag.id),
      ]);

      for (const condition of challenge.availableConditions) {
        expect(
          vocabulary,
          `${challenge.id} condition '${condition}'`,
        ).toContain(condition);
      }
    }
  });

  it("documents every exposed action brick from its scaffold", () => {
    for (const challenge of CHALLENGES) {
      const functions = new Map(
        challenge.scaffoldBrain.functions.functions.map((fn) => [fn.id, fn]),
      );
      for (const brickId of challenge.availableBricks) {
        const brick = functions.get(brickId);
        expect(brick, `${challenge.id} brick '${brickId}'`).toBeDefined();
        expect(
          brick?.description?.trim(),
          `${challenge.id} brick '${brickId}' description`,
        ).toBeTruthy();
        expect(
          Boolean(brick?.action || brick?.steps?.length),
          `${challenge.id} brick '${brickId}' implementation`,
        ).toBe(true);
      }
    }
  });

  it("starts every scored interview with an empty rule set", () => {
    for (const challenge of CHALLENGES.filter(
      (item) => item.interviewEvaluation,
    )) {
      expect(
        challenge.scaffoldBrain.rules.rules,
        `${challenge.id} interview scaffold`,
      ).toEqual([]);
    }
  });
});
