import path from "node:path";

import { FileAssessmentStore } from "./fileStore";
import { MemoryAssessmentStore } from "./memoryStore";
import type { AssessmentStore } from "./types";

export type { AssessmentStore } from "./types";

const globalForStore = globalThis as unknown as { __ctrlAssessmentStore?: AssessmentStore };

/**
 * ASSESSMENT_STORE selects the backend: "file" (JSON in ./.data/assessments) or "memory".
 * In development the default is "file". In production there is no safe default (serverless
 * disks and memory are ephemeral), so an explicit value is required until a real database
 * implementation is added.
 */
export function getAssessmentStore(): AssessmentStore {
  if (globalForStore.__ctrlAssessmentStore) return globalForStore.__ctrlAssessmentStore;
  const choice = process.env.ASSESSMENT_STORE ?? (process.env.NODE_ENV === "production" ? "" : "file");
  let store: AssessmentStore;
  if (choice === "memory") store = new MemoryAssessmentStore();
  else if (choice === "file") {
    store = new FileAssessmentStore(process.env.ASSESSMENT_DATA_DIR ?? path.join(process.cwd(), ".data", "assessments"));
  } else {
    throw new Error(
      "Assessment storage is not configured. Set ASSESSMENT_STORE=file|memory (see docs/CODEBASE_ASSESSMENT_API.md).",
    );
  }
  globalForStore.__ctrlAssessmentStore = store;
  return store;
}

/** Test hook: replace the active store. */
export function setAssessmentStore(store: AssessmentStore | undefined) {
  globalForStore.__ctrlAssessmentStore = store;
}
