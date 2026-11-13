import { describe, expect, it } from "vitest";

import {
  applyChanges, diffFiles, filesAtSnapshot, lineDiff, normalizePath, readFolderUpload, validateFileMap,
  FileValidationError, MAX_FILE_BYTES,
} from "../files";
import type { Snapshot } from "../types";

describe("normalizePath", () => {
  it("makes paths absolute and clean", () => {
    expect(normalizePath("src/App.js")).toBe("/src/App.js");
    expect(normalizePath("./a//b.js")).toBe("/a/b.js");
  });
  it("rejects traversal, backslashes, nulls and empty paths", () => {
    for (const bad of ["../x", "a/../../x", "a\\b", "a\0b", "", "/", "."]) {
      expect(() => normalizePath(bad)).toThrow(FileValidationError);
    }
  });
});

describe("validateFileMap", () => {
  it("normalises paths", () => {
    expect(validateFileMap({ "src/a.js": "x" })).toEqual({ "/src/a.js": "x" });
  });
  it("rejects non-text, oversize and non-objects", () => {
    expect(() => validateFileMap({ "/a": 1 })).toThrow();
    expect(() => validateFileMap({ "/a": "x".repeat(MAX_FILE_BYTES + 1) })).toThrow();
    expect(() => validateFileMap([])).toThrow();
    expect(() => validateFileMap(null)).toThrow();
  });
});

describe("readFolderUpload", () => {
  const entry = (path: string, body = "x", size = body.length) => ({ path, size, read: async () => body });
  it("strips a shared root, skips junk and reports why", async () => {
    const result = await readFolderUpload([
      entry("app/src/App.js", "code"),
      entry("app/package.json", "{}"),
      entry("app/node_modules/react/index.js"),
      entry("app/package-lock.json"),
      entry("app/logo.png"),
      entry("app/big.js", "x", MAX_FILE_BYTES + 1),
    ]);
    expect(Object.keys(result.files).sort()).toEqual(["/package.json", "/src/App.js"]);
    expect(result.skipped.map((s) => s.reason).sort()).toEqual([
      "binary file", "file too large", "inside node_modules/", "lockfile / system file",
    ]);
  });
  it("keeps the root when files sit at several top levels", async () => {
    const result = await readFolderUpload([entry("a/x.js"), entry("b/y.js")]);
    expect(Object.keys(result.files).sort()).toEqual(["/a/x.js", "/b/y.js"]);
  });
});

describe("diff and replay", () => {
  it("round-trips changes including deletions", () => {
    const a = { "/a": "1", "/b": "2" };
    const b = { "/a": "1x", "/c": "3" };
    const changes = diffFiles(a, b);
    expect(changes).toEqual({ "/a": "1x", "/c": "3", "/b": null });
    expect(applyChanges(a, changes)).toEqual(b);
  });
  it("rebuilds the project at any snapshot", () => {
    const snaps: Snapshot[] = [
      { at: 0, reason: "start", changes: { "/a": "1" } },
      { at: 5, reason: "autosave", changes: { "/a": "2", "/b": "x" } },
      { at: 9, reason: "run", changes: { "/b": null } },
    ];
    expect(filesAtSnapshot(snaps, 0)).toEqual({ "/a": "1" });
    expect(filesAtSnapshot(snaps, 1)).toEqual({ "/a": "2", "/b": "x" });
    expect(filesAtSnapshot(snaps, 99)).toEqual({ "/a": "2" });
  });
  it("produces a line diff", () => {
    const d = lineDiff("a\nb\nc", "a\nB\nc\nd");
    expect(d.filter((l) => l.type === "add").map((l) => l.text)).toEqual(["B", "d"]);
    expect(d.filter((l) => l.type === "del").map((l) => l.text)).toEqual(["b"]);
    expect(lineDiff("", "x")).toEqual([{ type: "add", text: "x" }]);
  });
});
