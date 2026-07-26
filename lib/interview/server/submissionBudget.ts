import type { BrainSource } from "@/lib/engine/simulation";

/** Shared budget for every server-evaluated visual interview policy. */
export function assertInterviewSubmissionBudget(brain: BrainSource): void {
  const encoded = JSON.stringify(brain);
  if (encoded.length > 100_000) {
    throw new Error("Submission exceeds the 100 KB interview policy limit.");
  }
  if ((brain.rules?.rules?.length ?? 0) > 100) {
    throw new Error("Submission exceeds the 100-rule interview policy limit.");
  }
  if ((brain.functions?.functions?.length ?? 0) > 50) {
    throw new Error("Submission exceeds the 50-function interview policy limit.");
  }
}
