import type { FileMap, Snapshot } from "./types";

export const MAX_FILES = 200;
export const MAX_FILE_BYTES = 200_000;
export const MAX_TOTAL_BYTES = 1_500_000;

export class FileValidationError extends Error {}

const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "coverage", ".cache", ".turbo", ".vscode", ".idea",
]);
const IGNORED_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".DS_Store", "bun.lockb",
]);
const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|bmp|pdf|zip|gz|tar|woff2?|ttf|eot|otf|mp[34]|mov|wav|ogg|exe|dll|so|dylib|class|jar|wasm)$/i;

/** Normalise to an absolute, forward-slash path, rejecting traversal and odd characters. */
export function normalizePath(input: string): string {
  if (typeof input !== "string" || input.includes("\0") || input.includes("\\")) {
    throw new FileValidationError(`Invalid file path: ${JSON.stringify(input)}`);
  }
  const parts = input.split("/").filter((p) => p !== "" && p !== ".");
  if (parts.length === 0 || parts.some((p) => p === "..")) {
    throw new FileValidationError(`Invalid file path: ${JSON.stringify(input)}`);
  }
  return "/" + parts.join("/");
}

/** Validate and normalise a file map against the size and count limits. */
export function validateFileMap(files: unknown, label = "files"): FileMap {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new FileValidationError(`${label} must be an object of path → content.`);
  }
  const out: FileMap = {};
  let total = 0;
  for (const [rawPath, content] of Object.entries(files as Record<string, unknown>)) {
    if (typeof content !== "string") {
      throw new FileValidationError(`${label}: '${rawPath}' must be text.`);
    }
    const path = normalizePath(rawPath);
    const bytes = new TextEncoder().encode(content).length;
    if (bytes > MAX_FILE_BYTES) {
      throw new FileValidationError(`${label}: '${path}' is larger than ${MAX_FILE_BYTES / 1000} KB.`);
    }
    total += bytes;
    out[path] = content;
  }
  if (Object.keys(out).length > MAX_FILES) {
    throw new FileValidationError(`${label}: at most ${MAX_FILES} files are allowed.`);
  }
  if (total > MAX_TOTAL_BYTES) {
    throw new FileValidationError(`${label}: total size exceeds ${MAX_TOTAL_BYTES / 1_000_000} MB.`);
  }
  return out;
}

export interface UploadEntry {
  /** Path as reported by the browser, e.g. "my-app/src/App.js". */
  path: string;
  size: number;
  read: () => Promise<string>;
}

export interface UploadResult {
  files: FileMap;
  /** Paths skipped, with the reason. Shown to the author so nothing vanishes silently. */
  skipped: { path: string; reason: string }[];
}

/**
 * Turn a dropped/selected folder into a FileMap. Skips dependencies, build output,
 * lockfiles, binaries and oversize files, and strips a single shared root folder.
 */
export async function readFolderUpload(entries: UploadEntry[]): Promise<UploadResult> {
  const skipped: UploadResult["skipped"] = [];
  const kept: UploadEntry[] = [];
  for (const entry of entries) {
    const segments = entry.path.split("/").filter(Boolean);
    const name = segments[segments.length - 1] ?? "";
    const ignoredDir = segments.slice(0, -1).find((s) => IGNORED_DIRS.has(s));
    if (ignoredDir) skipped.push({ path: entry.path, reason: `inside ${ignoredDir}/` });
    else if (IGNORED_FILES.has(name)) skipped.push({ path: entry.path, reason: "lockfile / system file" });
    else if (BINARY_EXT.test(name)) skipped.push({ path: entry.path, reason: "binary file" });
    else if (entry.size > MAX_FILE_BYTES) skipped.push({ path: entry.path, reason: "file too large" });
    else kept.push(entry);
  }
  // Strip one common top-level folder (what a user gets when they pick "my-app/").
  const firsts = new Set(kept.map((e) => e.path.split("/").filter(Boolean)[0]));
  const strip = firsts.size === 1 && kept.every((e) => e.path.split("/").filter(Boolean).length > 1);
  const files: FileMap = {};
  for (const entry of kept) {
    const segments = entry.path.split("/").filter(Boolean);
    const rel = (strip ? segments.slice(1) : segments).join("/");
    try {
      files[normalizePath(rel)] = await entry.read();
    } catch {
      skipped.push({ path: entry.path, reason: "unreadable or invalid path" });
    }
  }
  return { files, skipped };
}

/** Changes needed to go from `prev` to `next` (null = deleted). */
export function diffFiles(prev: FileMap, next: FileMap): Record<string, string | null> {
  const changes: Record<string, string | null> = {};
  for (const [path, content] of Object.entries(next)) {
    if (prev[path] !== content) changes[path] = content;
  }
  for (const path of Object.keys(prev)) {
    if (!(path in next)) changes[path] = null;
  }
  return changes;
}

export function applyChanges(base: FileMap, changes: Record<string, string | null>): FileMap {
  const out: FileMap = { ...base };
  for (const [path, content] of Object.entries(changes)) {
    if (content === null) delete out[path];
    else out[path] = content;
  }
  return out;
}

/** Rebuild the project as it stood after snapshot `index` (inclusive). */
export function filesAtSnapshot(snapshots: Snapshot[], index: number): FileMap {
  let files: FileMap = {};
  const last = Math.min(index, snapshots.length - 1);
  for (let i = 0; i <= last; i++) files = applyChanges(files, snapshots[i].changes);
  return files;
}

export interface DiffLine {
  type: "same" | "add" | "del";
  text: string;
}

const MAX_DIFF_LINES = 1500;

/** Line diff (LCS). Falls back to whole-file replace for very large inputs. */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before === "" ? [] : before.split("\n");
  const b = after === "" ? [] : after.split("\n");
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) {
    return [
      ...a.map((text): DiffLine => ({ type: "del", text })),
      ...b.map((text): DiffLine => ({ type: "add", text })),
    ];
  }
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push({ type: "same", text: a[i] }); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ type: "del", text: a[i++] });
    else out.push({ type: "add", text: b[j++] });
  }
  while (i < a.length) out.push({ type: "del", text: a[i++] });
  while (j < b.length) out.push({ type: "add", text: b[j++] });
  return out;
}
