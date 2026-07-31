import { describe, expect, it } from "vitest";

import {
  activeIdentifierRange,
  replaceActiveIdentifier,
} from "./conditionAutocomplete";
import { groupConditionFlags } from "../blocks/ConditionFlagPicker";
import { controllerFactGroup } from "./ControllerReference";

describe("condition expression autocomplete", () => {
  it("targets the first partially typed condition", () => {
    expect(activeIdentifierRange("wallA", 5)).toEqual({
      start: 0,
      end: 5,
      query: "wallA",
    });
    expect(replaceActiveIdentifier("wallA", 5, "wallAhead")).toEqual({
      value: "wallAhead",
      caret: 9,
    });
  });

  it("replaces the active token after an existing condition and operator", () => {
    const expression = "wallAhead && wallR";
    expect(activeIdentifierRange(expression, expression.length)).toEqual({
      start: 13,
      end: 18,
      query: "wallR",
    });
    expect(
      replaceActiveIdentifier(expression, expression.length, "wallRight"),
    ).toEqual({
      value: "wallAhead && wallRight",
      caret: 22,
    });
  });

  it("inserts a condition at an empty caret after an operator", () => {
    const expression = "canRouteA || ";
    expect(
      replaceActiveIdentifier(
        expression,
        expression.length,
        "canRouteB",
      ),
    ).toEqual({
      value: "canRouteA || canRouteB",
      caret: 22,
    });
  });
});

describe("large authoring vocabularies", () => {
  it("groups the rule picker into small meaningful sections", () => {
    expect(
      groupConditionFlags([
        "always",
        "wallAhead",
        "onlineA",
        "queueDepth",
        "urgentAndSafe",
      ]),
    ).toEqual([
      { label: "General", flags: ["always"] },
      { label: "Navigation and progress", flags: ["wallAhead"] },
      {
        label: "This world’s facts",
        flags: ["onlineA", "queueDepth"],
      },
      {
        label: "Your reusable conditions",
        flags: ["urgentAndSafe"],
      },
    ]);
  });

  it("groups Code facts by the operational concept they describe", () => {
    expect(controllerFactGroup("onlineA")).toBe("Provider A");
    expect(controllerFactGroup("deadlineRemaining")).toBe(
      "Current transaction",
    );
    expect(controllerFactGroup("queueDepth")).toBe("Queue and outcomes");
    expect(controllerFactGroup("carElectric")).toBe("Current vehicle");
    expect(controllerFactGroup("laneAvailable")).toBe("Facility");
  });
});
