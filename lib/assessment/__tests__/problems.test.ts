import { describe, expect, it } from "vitest";

import { CODE_PROBLEMS, getCodeProblem } from "../problems";
import { getRuntime } from "../runtime/registry";

describe("example code problems", () => {
  it("have unique ids and a registered runtime", () => {
    const ids = CODE_PROBLEMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of CODE_PROBLEMS) expect(getRuntime(p.runtimeId), p.id).toBeDefined();
  });

  it("each has a brief, a summary, starter files and at least one visible test file", () => {
    for (const p of CODE_PROBLEMS) {
      const runtime = getRuntime(p.runtimeId)!;
      expect(p.scenario.length, p.id).toBeGreaterThan(40);
      expect(p.summary.length, p.id).toBeGreaterThan(10);
      expect(Object.keys(p.files).some(runtime.isTestFile), `${p.id} needs a test file`).toBe(true);
      expect(runtime.entryFile in p.files, `${p.id} needs its entry file ${runtime.entryFile}`).toBe(true);
    }
  });

  it("covers every level", () => {
    expect(new Set(CODE_PROBLEMS.map((p) => p.level))).toEqual(new Set(["easy", "medium", "hard"]));
  });

  it("looks problems up by id", () => {
    expect(getCodeProblem("cart-total")?.title).toBe("Fix the cart total");
    expect(getCodeProblem("nope")).toBeUndefined();
  });
});
