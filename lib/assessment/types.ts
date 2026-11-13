/** A project as a flat map of absolute paths (e.g. "/utils/cart.js") to text content. */
export type FileMap = Record<string, string>;

export interface RubricCriterion {
  id: string;
  label: string;
  description?: string;
  /** Highest score a reviewer can give for this criterion. */
  maxScore: number;
}

export type AiPolicy = "allowed" | "not_allowed";

export interface AssessmentSettings {
  /** Minutes allowed from the candidate pressing Start; null means untimed. */
  timeLimitMinutes: number | null;
  /** Shown to the candidate. Informational in v1; not technically enforced. */
  aiPolicy: AiPolicy;
}

export interface Assessment {
  id: string;
  title: string;
  /** Problem statement / real-world scenario shown to the candidate. */
  scenario: string;
  /** Id of a registered runtime adapter (see lib/assessment/runtime). */
  runtimeId: string;
  /** Starter project, including visible tests. Sent to the candidate. */
  files: FileMap;
  /** Hidden test files. NEVER sent to the candidate's browser. */
  hiddenTests: FileMap;
  rubric: RubricCriterion[];
  settings: AssessmentSettings;
  createdAt: number;
}

/** What a candidate is allowed to see. Hidden tests are removed. */
export type PublicAssessment = Omit<Assessment, "hiddenTests"> & {
  hasHiddenTests: boolean;
};

export type SnapshotReason = "start" | "autosave" | "run" | "submit";

/** A change set against the previous snapshot. A null value means the file was deleted. */
export interface Snapshot {
  /** Milliseconds since the session started. */
  at: number;
  reason: SnapshotReason;
  changes: Record<string, string | null>;
}

export type HiddenTestStatus =
  | "not_configured"
  | "pending"
  | "passed"
  | "failed"
  | "error";

export interface HiddenTestResult {
  status: HiddenTestStatus;
  passed?: number;
  total?: number;
  detail?: string;
}

export type Recommendation = "advance" | "hold" | "reject";

export interface Review {
  scores: Record<string, number>;
  notes: string;
  recommendation: Recommendation | null;
  updatedAt: number;
}

export interface CandidateIdentity {
  name: string;
  email: string;
}

export interface Session {
  id: string;
  assessmentId: string;
  candidate: CandidateIdentity;
  startedAt: number;
  lastSavedAt: number;
  submittedAt?: number;
  /** True when the final submission arrived after the time limit. */
  late?: boolean;
  status: "in_progress" | "submitted";
  /** Current working files (always equals the replay of `snapshots`). */
  files: FileMap;
  snapshots: Snapshot[];
  hiddenTestResult?: HiddenTestResult;
  review?: Review;
}

/** Process statistics derived from a session; see docs/CODEBASE_ASSESSMENT_REVIEW.md. */
export interface SessionStats {
  durationMs: number;
  snapshotCount: number;
  runCount: number;
  timeToFirstRunMs: number | null;
  filesChanged: number;
  filesAdded: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
}
