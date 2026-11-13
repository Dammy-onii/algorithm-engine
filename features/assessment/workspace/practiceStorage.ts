import type { FileMap } from "@/lib/assessment/types";

/**
 * Where a practice problem's work-in-progress is kept in this browser. Shared by the
 * workspace (which writes it) and the stand-alone preview tab (which reads and follows it).
 */
export const practiceStorageKey = (id: string) => `ctrl-code:${id}`;

export function loadPracticeFiles(id: string): FileMap | null {
  try {
    return parseSaved(localStorage.getItem(practiceStorageKey(id)));
  } catch {
    return null;
  }
}

/** Validates a stored value: a non-empty, reasonably sized map of path → source. */
export function parseSaved(raw: string | null): FileMap | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0 || entries.length > 200 || entries.some(([, v]) => typeof v !== "string")) return null;
    return value as FileMap;
  } catch {
    return null;
  }
}
