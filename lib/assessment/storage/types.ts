import type { Assessment, Session } from "../types";

/**
 * Persistence boundary. Every method is async so a real database (Supabase,
 * Postgres, …) can replace the stub implementations without touching callers.
 */
export interface AssessmentStore {
  createAssessment(assessment: Assessment): Promise<void>;
  getAssessment(id: string): Promise<Assessment | undefined>;
  /** Insert or replace a session. */
  saveSession(session: Session): Promise<void>;
  getSession(assessmentId: string, sessionId: string): Promise<Session | undefined>;
  listSessions(assessmentId: string): Promise<Session[]>;
}
