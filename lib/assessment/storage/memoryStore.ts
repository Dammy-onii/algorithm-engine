import type { Assessment, Session } from "../types";
import type { AssessmentStore } from "./types";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class MemoryAssessmentStore implements AssessmentStore {
  private assessments = new Map<string, Assessment>();
  private sessions = new Map<string, Session>();

  async createAssessment(assessment: Assessment) {
    this.assessments.set(assessment.id, clone(assessment));
  }
  async getAssessment(id: string) {
    const found = this.assessments.get(id);
    return found ? clone(found) : undefined;
  }
  async saveSession(session: Session) {
    this.sessions.set(`${session.assessmentId}/${session.id}`, clone(session));
  }
  async getSession(assessmentId: string, sessionId: string) {
    const found = this.sessions.get(`${assessmentId}/${sessionId}`);
    return found ? clone(found) : undefined;
  }
  async listSessions(assessmentId: string) {
    return [...this.sessions.values()]
      .filter((s) => s.assessmentId === assessmentId)
      .map(clone)
      .sort((a, b) => a.startedAt - b.startedAt);
  }
}
