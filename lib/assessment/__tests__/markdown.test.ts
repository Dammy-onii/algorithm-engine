import { describe, expect, it } from "vitest";

import { parseBlocks, parseInline } from "@/features/assessment/workspace/markdown";

describe("scenario markdown subset", () => {
  it("parses headings, lists, quotes, paragraphs and code fences", () => {
    const blocks = parseBlocks(
      "# Tasks\n\nFirst line\nsecond line\n\n- a\n- b\n\n> quoted\n> more\n\n```\nconst x = 1;\n```\n### 1.1 Detail",
    );
    expect(blocks).toEqual([
      { type: "heading", level: 1, text: "Tasks" },
      { type: "paragraph", text: "First line second line" },
      { type: "list", items: ["a", "b"] },
      { type: "quote", text: "quoted more" },
      { type: "code", text: "const x = 1;" },
      { type: "heading", level: 3, text: "1.1 Detail" },
    ]);
  });
  it("splits inline code and bold, and leaves markup characters as text", () => {
    expect(parseInline("Fix `GET /api` **now** <b>x</b>")).toEqual([
      { kind: "text", text: "Fix " },
      { kind: "code", text: "GET /api" },
      { kind: "text", text: " " },
      { kind: "bold", text: "now" },
      { kind: "text", text: " <b>x</b>" },
    ]);
  });
  it("keeps quotes separated by a blank line as separate blocks", () => {
    expect(parseBlocks("> one\n> still one\n\n> two")).toEqual([
      { type: "quote", text: "one still one" },
      { type: "quote", text: "two" },
    ]);
  });
  it("does not treat an unterminated fence as an error", () => {
    expect(parseBlocks("```\nabc")).toEqual([{ type: "code", text: "abc" }]);
  });
});
