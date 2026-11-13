import { diffFiles, filesAtSnapshot, validateFileMap, FileValidationError } from "../files";
import { DEFAULT_RUNTIME_ID, getRuntime } from "../runtime/registry";
import type { AssessmentStore } from "../storage/types";
import type {
  AiPolicy,
  Assessment,
  FileMap,
  PublicAssessment,
  Recommendation,
  Review,
  RubricCriterion,
  Session,
  SnapshotReason,
} from "../types";
import { getHiddenTestRunner } from "./hiddenTests";
import { newId } from "./link";

export type ServiceErrorCode =
  | "invalid" | "not_found" | "link_used" | "already_submitted" | "expired";

export class ServiceError extends Error {
  constructor(public code: ServiceErrorCode, message: string) {
    super(message);
  }
  get status() {
    return { invalid: 400, not_found: 404, link_used: 409, already_submitted: 409, expired: 410 }[this.code];
  }
}

/** Autosaves are rejected this long after the time limit; the final submit is still accepted (flagged late). */
export const EXPIRY_GRACE_MS = 60_000;
export const MAX_SNAPSHOTS = 500;

export const DEFAULT_RUBRIC: RubricCriterion[] = [
  { id: "understanding", label: "Understanding the codebase", description: "Found the real problem and its cause.", maxScore: 5 },
  { id: "correctness", label: "Correctness", description: "The change works and handles edge cases.", maxScore: 5 },
  { id: "quality", label: "Code quality", description: "Readable, minimal and consistent with the codebase.", maxScore: 5 },
  { id: "judgement", label: "Engineering judgement", description: "Sensible trade-offs, testing and follow-ups.", maxScore: 5 },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(message: string): never {
  throw new ServiceError("invalid", message);
}

function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") fail(`${label} is required.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) fail(`${label} must be ${min}–${max} characters.`);
  return trimmed;
}

function files(value: unknown, label: string): FileMap {
  try {
    return validateFileMap(value, label);
  } catch (error) {
    if (error instanceof FileValidationError) fail(error.message);
    throw error;
  }
}

export interface CreateAssessmentInput {
  title?: unknown;
  scenario?: unknown;
  runtimeId?: unknown;
  files?: unknown;
  hiddenTests?: unknown;
  rubric?: unknown;
  timeLimitMinutes?: unknown;
  aiPolicy?: unknown;
}

export async function createAssessment(store: AssessmentStore, input: CreateAssessmentInput): Promise<Assessment> {
  const runtimeId = typeof input.runtimeId === "string" ? input.runtimeId : DEFAULT_RUNTIME_ID;
  if (!getRuntime(runtimeId)) fail(`Unknown runtime '${runtimeId}'.`);

  const starter = files(input.files, "Starter files");
  if (Object.keys(starter).length === 0) fail("Add at least one file to the starter project.");
  const hidden = input.hiddenTests === undefined ? {} : files(input.hiddenTests, "Hidden tests");

  let rubric = DEFAULT_RUBRIC;
  if (input.rubric !== undefined) {
    if (!Array.isArray(input.rubric) || input.rubric.length > 10) fail("Rubric must be a list of up to 10 criteria.");
    rubric = input.rubric.map((raw, index) => {
      const r = raw as Partial<RubricCriterion>;
      const maxScore = Number(r.maxScore ?? 5);
      if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 10) fail("Rubric max score must be 1–10.");
      return {
        id: `c${index + 1}`,
        label: text(r.label, "Rubric label", 1, 80),
        description: typeof r.description === "string" ? r.description.slice(0, 300) : undefined,
        maxScore,
      };
    });
  }

  let timeLimitMinutes: number | null = null;
  if (input.timeLimitMinutes !== undefined && input.timeLimitMinutes !== null && input.timeLimitMinutes !== "") {
    timeLimitMinutes = Number(input.timeLimitMinutes);
    if (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 5 || timeLimitMinutes > 480) {
      fail("Time limit must be a whole number of minutes between 5 and 480.");
    }
  }
  const aiPolicy: AiPolicy = input.aiPolicy === "allowed" ? "allowed" : "not_allowed";

  const assessment: Assessment = {
    id: newId(12),
    title: text(input.title, "Title", 3, 120),
    scenario: text(input.scenario, "Scenario", 10, 8000),
    runtimeId,
    files: starter,
    hiddenTests: hidden,
    rubric,
    settings: { timeLimitMinutes, aiPolicy },
    createdAt: Date.now(),
  };
  await store.createAssessment(assessment);
  return assessment;
}

export function toPublicAssessment(assessment: Assessment): PublicAssessment {
  const { hiddenTests, ...rest } = assessment;
  return { ...rest, hasHiddenTests: Object.keys(hiddenTests).length > 0 };
}

async function loadAssessment(store: AssessmentStore, id: string): Promise<Assessment> {
  const assessment = await store.getAssessment(id);
  if (!assessment) throw new ServiceError("not_found", "Assessment not found.");
  return assessment;
}

/** What the candidate's browser receives about a session. Never includes review data. */
export interface CandidateSessionView {
  sessionId: string;
  startedAt: number;
  /** Absolute deadline (ms epoch), or null when untimed. */
  deadline: number | null;
  status: Session["status"];
  files: FileMap;
}

export function candidateView(session: Session, assessment: Assessment): CandidateSessionView {
  const limit = assessment.settings.timeLimitMinutes;
  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    deadline: limit === null ? null : session.startedAt + limit * 60_000,
    status: session.status,
    files: session.files,
  };
}

/**
 * Start (or resume) the single attempt a link allows. A link is bound to the first
 * session started on it; only the browser holding that session id can resume it.
 */
export async function startSession(
  store: AssessmentStore,
  assessmentId: string,
  input: { name?: unknown; email?: unknown; sessionId?: unknown },
): Promise<{ view: CandidateSessionView; resumed: boolean }> {
  const assessment = await loadAssessment(store, assessmentId);
  const existing = (await store.listSessions(assessmentId))[0];

  if (existing) {
    if (typeof input.sessionId !== "string" || input.sessionId !== existing.id) {
      throw new ServiceError("link_used", "This assessment link has already been used.");
    }
    if (existing.status === "submitted") {
      throw new ServiceError("already_submitted", "You have already submitted this assessment.");
    }
    return { view: candidateView(existing, assessment), resumed: true };
  }

  const name = text(input.name, "Name", 1, 100);
  const email = text(input.email, "Email", 3, 200);
  if (!EMAIL.test(email)) fail("Enter a valid email address.");

  const now = Date.now();
  const session: Session = {
    id: newId(16),
    assessmentId,
    candidate: { name, email },
    startedAt: now,
    lastSavedAt: now,
    status: "in_progress",
    files: { ...assessment.files },
    snapshots: [{ at: 0, reason: "start", changes: { ...assessment.files } }],
  };
  await store.saveSession(session);
  return { view: candidateView(session, assessment), resumed: false };
}

async function loadOpenSession(store: AssessmentStore, assessmentId: string, sessionId: string) {
  const assessment = await loadAssessment(store, assessmentId);
  const session = await store.getSession(assessmentId, sessionId);
  if (!session) throw new ServiceError("not_found", "Session not found.");
  if (session.status === "submitted") throw new ServiceError("already_submitted", "This assessment was already submitted.");
  return { assessment, session };
}

function applySave(session: Session, next: FileMap, reason: SnapshotReason, now: number) {
  const base = filesAtSnapshot(session.snapshots, session.snapshots.length - 1);
  const changes = diffFiles(base, next);
  const capped = session.snapshots.length >= MAX_SNAPSHOTS && reason !== "submit";
  const meaningful = Object.keys(changes).length > 0 || reason === "run" || reason === "submit";
  if (meaningful && !capped) {
    session.snapshots.push({ at: Math.max(0, now - session.startedAt), reason, changes });
  }
  session.files = next;
  session.lastSavedAt = now;
}

/** Autosave or record a run. Rejected once the deadline plus grace has passed. */
export async function saveProgress(
  store: AssessmentStore,
  assessmentId: string,
  sessionId: string,
  input: { files?: unknown; reason?: unknown },
): Promise<CandidateSessionView> {
  const { assessment, session } = await loadOpenSession(store, assessmentId, sessionId);
  const now = Date.now();
  const limit = assessment.settings.timeLimitMinutes;
  if (limit !== null && now > session.startedAt + limit * 60_000 + EXPIRY_GRACE_MS) {
    throw new ServiceError("expired", "The time limit has passed. Submit what you have.");
  }
  const reason: SnapshotReason = input.reason === "run" ? "run" : "autosave";
  applySave(session, files(input.files, "Files"), reason, now);
  await store.saveSession(session);
  return candidateView(session, assessment);
}

/** Final submit. Always accepted once; flagged late when past the deadline. */
export async function submitSession(
  store: AssessmentStore,
  assessmentId: string,
  sessionId: string,
  input: { files?: unknown },
): Promise<Session> {
  const { assessment, session } = await loadOpenSession(store, assessmentId, sessionId);
  const now = Date.now();
  const limit = assessment.settings.timeLimitMinutes;
  applySave(session, files(input.files, "Files"), "submit", now);
  session.status = "submitted";
  session.submittedAt = now;
  session.late = limit !== null && now > session.startedAt + limit * 60_000 + EXPIRY_GRACE_MS;
  try {
    session.hiddenTestResult = await getHiddenTestRunner().run(assessment, session.files);
  } catch (error) {
    session.hiddenTestResult = {
      status: "error",
      detail: error instanceof Error ? error.message : "The hidden-test runner failed.",
    };
  }
  await store.saveSession(session);
  return session;
}

const RECOMMENDATIONS: Recommendation[] = ["advance", "hold", "reject"];

export async function saveReview(
  store: AssessmentStore,
  assessmentId: string,
  sessionId: string,
  input: { scores?: unknown; notes?: unknown; recommendation?: unknown },
): Promise<Review> {
  const assessment = await loadAssessment(store, assessmentId);
  const session = await store.getSession(assessmentId, sessionId);
  if (!session) throw new ServiceError("not_found", "Submission not found.");

  const scores: Record<string, number> = {};
  const raw = (input.scores ?? {}) as Record<string, unknown>;
  for (const criterion of assessment.rubric) {
    const value = raw[criterion.id];
    if (value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > criterion.maxScore) {
      fail(`${criterion.label} must be a whole number from 0 to ${criterion.maxScore}.`);
    }
    scores[criterion.id] = n;
  }
  const recommendation =
    typeof input.recommendation === "string" && RECOMMENDATIONS.includes(input.recommendation as Recommendation)
      ? (input.recommendation as Recommendation)
      : null;

  const review: Review = {
    scores,
    notes: typeof input.notes === "string" ? input.notes.slice(0, 5000) : "",
    recommendation,
    updatedAt: Date.now(),
  };
  session.review = review;
  await store.saveSession(session);
  return review;
}
