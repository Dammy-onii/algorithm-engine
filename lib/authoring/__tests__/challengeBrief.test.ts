import { describe, expect, it } from "vitest";

import { normalizeBrief, paragraphsFromText, taxonomyFor } from "../challengeBrief";
import { evaluateSteps } from "../objectives";
import { ChallengeData } from "../types";

const base: ChallengeData = {
  id: "demo",
  pack: "warehouse",
  number: 6,
  name: "Demo",
  difficulty: 1,
  stage: "practice",
  worldKey: "demo-world",
  tagline: "A one-line hook.",
  narrative: "A longer story paragraph.",
  objective: "Do the thing.",
  learningObjective: "Learn the concept.",
  intelligenceExplanation: "What the scaffold already does.",
  hint: "Try this.",
  availableBricks: [],
  availableConditions: [],
  functionsUnlocked: false,
  objectives: [
    { id: "win", label: "Reach the goal", check: "reached" },
    { id: "fast", label: "Be quick", check: "reached && ticks <= 10", bonus: true },
  ],
  scaffoldBrain: {
    goals: { goals: [] },
    states: { initial: "s", states: [{ id: "s" }] },
    rules: { rules: [] },
    functions: { functions: [] },
    memory: {},
  },
};

describe("normalizeBrief", () => {
  it("falls back to legacy free-text fields", () => {
    const brief = normalizeBrief(base);
    expect(brief.headline).toBe("Do the thing.");
    expect(brief.context).toBe("A one-line hook.");
    expect(brief.detail).toEqual(["A longer story paragraph.", "What the scaffold already does."]);
    expect(brief.hints).toEqual(["Try this."]);
  });

  it("derives the checklist from required objectives when no steps are authored", () => {
    const brief = normalizeBrief(base);
    // Only the non-bonus objective becomes a step.
    expect(brief.steps.map((s) => s.id)).toEqual(["win"]);
  });

  it("prefers structured fields when present", () => {
    const brief = normalizeBrief({
      ...base,
      brief: "Short what-to-do.",
      context: "Short scenario.",
      steps: [{ id: "a", label: "Step A", check: "reached" }],
    });
    expect(brief.headline).toBe("Short what-to-do.");
    expect(brief.context).toBe("Short scenario.");
    expect(brief.steps.map((s) => s.id)).toEqual(["a"]);
  });
});

describe("paragraphsFromText", () => {
  it("keeps authored blank-line breaks as separate readable paragraphs", () => {
    expect(paragraphsFromText("First idea.\n\nSecond idea.\n\n")).toEqual([
      "First idea.",
      "Second idea.",
    ]);
  });
});

describe("taxonomyFor", () => {
  it("uses the structured taxonomy block", () => {
    const t = taxonomyFor({
      ...base,
      taxonomy: { domain: "Finance", simulation: "Payment Routing", tier: "easy", grade: 5 },
    });
    expect(t.badge).toBe("Easy · Grade 5");
    expect(t.full).toBe("Finance · Easy · Grade 5");
  });

  it("infers a placement from legacy pack/stage/difficulty", () => {
    const t = taxonomyFor(base);
    expect(t.domain).toBe("Warehouse");
    expect(t.tier).toBe("Tutorial"); // "practice" → Tutorial
    expect(t.badge).toBe("Tutorial · Grade 1");
  });
});

describe("evaluateSteps", () => {
  it("marks a step done only when its check holds", () => {
    const steps = [
      { id: "picked", label: "Picked up", check: "carryingPackage" },
      { id: "delivered", label: "Delivered", check: "deliveredCount >= 1" },
    ];
    const results = evaluateSteps(steps, { carryingPackage: true, deliveredCount: 0 });
    expect(results.find((r) => r.id === "picked")?.done).toBe(true);
    expect(results.find((r) => r.id === "delivered")?.done).toBe(false);
  });

  it("treats a step with no check as informational", () => {
    const [r] = evaluateSteps([{ id: "note", label: "Just guidance" }], {});
    expect(r.informational).toBe(true);
    expect(r.done).toBe(false);
  });

  it("never throws on a malformed check — reads as not done", () => {
    const [r] = evaluateSteps([{ id: "bad", label: "Bad", check: "&& ||" }], {});
    expect(r.done).toBe(false);
  });
});
