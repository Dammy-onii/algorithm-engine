import { describe, expect, it } from "vitest";

import { findWorld } from "@/lib/content/datasets";
import { getChallenge } from "@/lib/content/registry";
import { challengePassed, evaluateObjectives, metricsFromSim } from "@/lib/authoring/objectives";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import { BrainSource, Simulation } from "../simulation";
import { WorldData } from "../types";
import { isPrime, sorterRuntime, validateSorterData } from "../worlds/sorter";

/** The challenge's own scaffold with the given rules swapped in. */
function brainFor(challengeId: string, rules: { when: string; do: string }[]): BrainSource {
  const challenge = getChallenge(challengeId)!;
  return {
    ...structuredClone(challenge.scaffoldBrain),
    rules: { rules: rules.map((rule, index) => ({ id: `r${index}`, ...rule })) },
  } as BrainSource;
}

function grade(challengeId: string, rules: { when: string; do: string }[]) {
  const challenge = getChallenge(challengeId)!;
  const brain = brainFor(challengeId, rules);
  const sim = new Simulation(findWorld(challenge.worldKey).source, brain);
  let guard = 0;
  while (!sim.isDone && guard < 500) {
    sim.tick();
    guard++;
  }
  const results = evaluateObjectives(
    challenge.objectives ?? [],
    metricsFromSim(sim, decompileBrain(brain)),
  );
  return { sim, passed: challengePassed(results) };
}

describe("sorter world module", () => {
  it("knows which small numbers are prime", () => {
    const primes = Array.from({ length: 30 }, (_, n) => n).filter(isPrime);
    expect(primes).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  });

  it("validates every shipped scenario", () => {
    for (const key of ["decisions-fragile-parcels", "decisions-even-odd", "decisions-prime-sorter"]) {
      expect(() => validateSorterData(findWorld(key).source.world)).not.toThrow();
    }
  });

  it("rejects a bin rule that does not parse", () => {
    const world = structuredClone(findWorld("decisions-prime-sorter").source.world) as WorldData & {
      sorter: { binARule: string };
    };
    world.sorter.binARule = "isPrime &&";
    expect(() => validateSorterData(world)).toThrow(/binARule/);
  });

  it("sorts one item per decision and grades it against the bin rule", () => {
    const { sim } = grade("decisions-prime-sorter", [{ when: "always", do: "send-to-prime-block" }]);
    const runtime = sorterRuntime(sim.world)!;
    expect(runtime.queue).toHaveLength(0);
    expect(runtime.sorted).toHaveLength(12);
    // 9 is not prime, so sending it to Prime is a mistake.
    expect(runtime.sorted.find((item) => item.number === 9)?.correctBin).toBe("B");
    expect(runtime.sorted.find((item) => item.number === 2)?.correctBin).toBe("A");
  });
});

describe("Simple Decisions scenarios", () => {
  it("Fragile Parcels passes with if/otherwise", () => {
    expect(
      grade("decisions-fragile-parcels", [
        { when: "isFragile", do: "send-to-fragile-block" },
        { when: "always", do: "send-to-standard-block" },
      ]).passed,
    ).toBe(true);
  });

  it("Fragile Parcels fails when the fallback sits above the special case", () => {
    expect(
      grade("decisions-fragile-parcels", [
        { when: "always", do: "send-to-standard-block" },
        { when: "isFragile", do: "send-to-fragile-block" },
      ]).passed,
    ).toBe(false);
  });

  it("Even or Odd passes with one rule per bin", () => {
    expect(
      grade("decisions-even-odd", [
        { when: "isEven", do: "send-to-even-block" },
        { when: "isOdd", do: "send-to-odd-block" },
      ]).passed,
    ).toBe(true);
  });

  it("Even or Odd fails with the bins swapped", () => {
    expect(
      grade("decisions-even-odd", [
        { when: "isEven", do: "send-to-odd-block" },
        { when: "isOdd", do: "send-to-even-block" },
      ]).passed,
    ).toBe(false);
  });

  it("Prime or Not passes with isPrime", () => {
    expect(
      grade("decisions-prime-sorter", [
        { when: "isPrime", do: "send-to-prime-block" },
        { when: "always", do: "send-to-non-prime-block" },
      ]).passed,
    ).toBe(true);
  });

  it("Prime or Not fails the odd-means-prime shortcut", () => {
    expect(
      grade("decisions-prime-sorter", [
        { when: "isOdd", do: "send-to-prime-block" },
        { when: "always", do: "send-to-non-prime-block" },
      ]).passed,
    ).toBe(false);
  });
});
