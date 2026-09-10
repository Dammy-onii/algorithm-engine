import { describe, expect, it } from "vitest";

import { VisualRule } from "@/lib/authoring/types";
import { appendRuleToFlow } from "./RuleBuilder";

function rule(id: string): VisualRule {
  return {
    id,
    state: null,
    condition: {
      mode: "guided",
      group: {
        operator: "&&",
        atoms: [{ flag: "always", negated: false }],
      },
    },
    functionId: "hold",
    setState: null,
    priority: 0,
    description: "",
  };
}

describe("RuleBuilder flow insertion", () => {
  it("appends a new rule without changing the existing top-to-bottom order", () => {
    const first = rule("first");
    const second = rule("second");
    const added = rule("added");

    const result = appendRuleToFlow([first, second], added);

    expect(result.map((item) => item.id)).toEqual(["first", "second", "added"]);
  });
});
