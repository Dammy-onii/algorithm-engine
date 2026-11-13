import type { Assessment, FileMap, HiddenTestResult } from "../types";

/**
 * Hidden tests must never run in the candidate's browser. The runner executes the
 * submitted files plus the assessment's hidden tests somewhere isolated and returns a
 * summary. v1 ships without a runner (running untrusted code needs a sandboxed host):
 * submissions are stored with status "not_configured" and reviewers run them offline.
 * See docs/CODEBASE_ASSESSMENT_API.md → "Hidden-test runner".
 */
export interface HiddenTestRunner {
  run(assessment: Assessment, submittedFiles: FileMap): Promise<HiddenTestResult>;
}

export const notConfiguredRunner: HiddenTestRunner = {
  async run(assessment) {
    return Object.keys(assessment.hiddenTests).length === 0
      ? { status: "not_configured", detail: "This assessment has no hidden tests." }
      : {
          status: "not_configured",
          detail: "No hidden-test runner is configured; run the hidden tests against the submitted files manually.",
        };
  },
};

let activeRunner: HiddenTestRunner = notConfiguredRunner;

export const getHiddenTestRunner = () => activeRunner;
export const setHiddenTestRunner = (runner: HiddenTestRunner) => {
  activeRunner = runner;
};
