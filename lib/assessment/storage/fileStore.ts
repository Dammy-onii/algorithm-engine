import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Assessment, Session } from "../types";
import type { AssessmentStore } from "./types";

const SAFE_ID = /^[A-Za-z0-9_-]{6,64}$/;

function assertId(id: string) {
  if (!SAFE_ID.test(id)) throw new Error("Invalid id.");
  return id;
}

/** JSON-on-disk store for local development and single-machine pilots. */
export class FileAssessmentStore implements AssessmentStore {
  constructor(private readonly root: string) {}

  private async readJson<T>(file: string): Promise<T | undefined> {
    try {
      return JSON.parse(await readFile(file, "utf8")) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  private dir(assessmentId: string) {
    return path.join(this.root, assertId(assessmentId));
  }

  async createAssessment(assessment: Assessment) {
    const dir = this.dir(assessment.id);
    await mkdir(path.join(dir, "sessions"), { recursive: true });
    await writeFile(path.join(dir, "assessment.json"), JSON.stringify(assessment));
  }
  async getAssessment(id: string) {
    return this.readJson<Assessment>(path.join(this.dir(id), "assessment.json"));
  }
  async saveSession(session: Session) {
    const dir = path.join(this.dir(session.assessmentId), "sessions");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${assertId(session.id)}.json`), JSON.stringify(session));
  }
  async getSession(assessmentId: string, sessionId: string) {
    return this.readJson<Session>(
      path.join(this.dir(assessmentId), "sessions", `${assertId(sessionId)}.json`),
    );
  }
  async listSessions(assessmentId: string) {
    const dir = path.join(this.dir(assessmentId), "sessions");
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      return [];
    }
    const sessions = await Promise.all(
      names.filter((n) => n.endsWith(".json")).map((n) => this.readJson<Session>(path.join(dir, n))),
    );
    return sessions.filter((s): s is Session => !!s).sort((a, b) => a.startedAt - b.startedAt);
  }
}
