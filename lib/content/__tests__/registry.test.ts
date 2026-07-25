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

describe("content registry", () => {
  it("lists the known packs", () => {
    const ids = listPacks().map((p) => p.id);
    expect(ids).toContain("maze");
    expect(ids).toContain("warehouse");
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
    const first = firstChallengeInPack("warehouse");
    expect(first).toBeDefined();
    expect(packForChallenge(first!.id)).toBe("warehouse");
    expect(getChallenge(first!.id)?.id).toBe(first!.id);
    expect(getChallenge("not-a-real-challenge")).toBeUndefined();
  });

  it("does not publish the removed Maze level 5", () => {
    expect(
      challengesInPack("maze").some((challenge) => challenge.id === "open-arena"),
    ).toBe(false);
    expect(getChallenge("open-arena")).toBeUndefined();
  });
});
