import { describe, expect, it } from "vitest";

import {
  activeIdentifierRange,
  replaceActiveIdentifier,
} from "./conditionAutocomplete";

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
