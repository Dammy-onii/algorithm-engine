import type { FileMap } from "@/lib/assessment/types";

/**
 * Where a practice problem's work-in-progress is kept in this browser. Shared by the
 * workspace (which writes it) and the stand-alone preview tab (which reads and follows it).
 */
export const practiceStorageKey = (id: string) => `ctrl-code:${id}`;

/**
 * Saved work for a problem, or null. Work saved before a problem changed layout (for
 * example root-level React files before the move to src/) doesn't contain the current
 * entry file and is ignored, so it can't be restored over the new files.
 */
export function loadPracticeFiles(id: string, entryFile?: string): FileMap | null {
  try {
    const saved = parseSaved(localStorage.getItem(practiceStorageKey(id)));
    return saved && entryFile && !(entryFile in saved) ? null : saved;
  } catch {
    return null;
  }
}

/** Validates a stored value: a non-empty, reasonably sized map of path → source. */
export function parseSaved(raw: string | null, entryFile?: string): FileMap | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0 || entries.length > 200 || entries.some(([, v]) => typeof v !== "string")) return null;
    if (entryFile && !(entryFile in value)) return null;
    return value as FileMap;
  } catch {
    return null;
  }
}
