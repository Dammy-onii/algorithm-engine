import { describe, expect, it } from "vitest";

import InterviewAssignmentPage from "@/app/i/[assignmentId]/page";
import InterviewAssignmentChallengePage from "@/app/i/[assignmentId]/[challengeId]/page";
import { POST as createAssignment } from "@/app/api/interview/assignments/route";
import { InterviewAssignmentDirectoryPage } from "@/features/interview/pages/InterviewAssignmentDirectoryPage";
import { StudioPage } from "@/features/studio/pages/StudioPage";
import {
  assignableChallengesInPack,
  normalizeInterviewSelection,
} from "@/lib/interview/assignment";
import {
  createInterviewAssignmentId,
  resolveInterviewAssignment,
} from "@/lib/interview/server/assignmentToken";

describe("multi-problem interview assignments", () => {
  it("sorts a selection by ascending difficulty with no forced tutorial", () => {
    const finance = normalizeInterviewSelection([
      "finance-production-orchestrator",
      "finance-peak-hour-switch",
    ]);

    // No challenge is auto-included; the two picked problems just sort by
    // ascending difficulty.
    expect(finance.map((challenge) => challenge.id)).toEqual([
      "finance-peak-hour-switch",
      "finance-production-orchestrator",
    ]);

    expect(
      assignableChallengesInPack("parking").map((challenge) => challenge.id),
    ).toEqual([
      "parking-first-shift",
      "parking-match-vehicle",
      "parking-priority-access",
      "parking-interview-controller",
      "parking-interview-operations",
      "parking-interview-orchestrator",
    ]);
  });

  it("allows every published level in a world without requiring a hidden suite", () => {
    expect(
      assignableChallengesInPack("maze").map((challenge) => challenge.id),
    ).toEqual([
      "straight-line",
      "one-corner",
      "dead-end",
      "snake-corridor",
      "branching-maze",
    ]);

    expect(
      normalizeInterviewSelection([
        "branching-maze",
        "straight-line",
      ]).map((challenge) => challenge.id),
    ).toEqual(["straight-line", "branching-maze"]);
  });

  it("round-trips every selected problem without silently dropping one", () => {
    for (const packId of ["maze", "finance", "parking"]) {
      const selected = assignableChallengesInPack(packId).map(
        (challenge) => challenge.id,
      );
      const id = createInterviewAssignmentId(selected);
      expect(resolveInterviewAssignment(id)?.challengeIds).toEqual(
        normalizeInterviewSelection(selected).map((challenge) => challenge.id),
      );
    }
  });

  it("creates a compact signed id and rejects a modified id", () => {
    const id = createInterviewAssignmentId([
      "parking-interview-orchestrator",
      "parking-interview-operations",
    ]);

    expect(id.length).toBeLessThan(24);
    expect(resolveInterviewAssignment(id)?.challengeIds).toEqual([
      "parking-interview-operations",
      "parking-interview-orchestrator",
    ]);

    // Tamper a character inside the signature bytes. The very last base64url
    // character only carries discarded low bits, so flip one further in where
    // every bit maps to a real byte, guaranteeing the signature check fails.
    const flipIndex = id.length - 4;
    const replacement = id[flipIndex] === "A" ? "B" : "A";
    const tampered = id.slice(0, flipIndex) + replacement + id.slice(flipIndex + 1);
    expect(resolveInterviewAssignment(tampered)).toBe(undefined);
  });

  it("rejects every assignment link from the cleared v1–v3 generations", () => {
    // Previously issued v2 link for straight-line + branching-maze.
    expect(
      resolveInterviewAssignment("AgIAAAEABhnq0VOyiw"),
    ).toBeUndefined();
    // Previously issued v3 link for straight-line.
    expect(resolveInterviewAssignment("AwEAAAFdSppRv5U")).toBeUndefined();

    const current = createInterviewAssignmentId(["straight-line"]);
    expect(Buffer.from(current, "base64url").readUInt8(0)).toBe(4);
  });

  it("keeps levels from different worlds distinct by encoding their world", () => {
    const mazeId = createInterviewAssignmentId(["branching-maze"]);
    const financeId = createInterviewAssignmentId(["finance-basic-route"]);

    expect(resolveInterviewAssignment(mazeId)?.challengeIds).toEqual([
      "branching-maze",
    ]);
    expect(resolveInterviewAssignment(financeId)?.challengeIds).toEqual([
      "finance-basic-route",
    ]);
  });

  it("creates the short link through the assignment API", async () => {
    const response = await createAssignment(
      new Request("http://localhost/api/interview/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeIds: [
            "finance-production-orchestrator",
            "finance-peak-hour-switch",
          ],
        }),
      }),
    );
    const body = (await response.json()) as {
      assignmentId: string;
      challengeIds: string[];
      path: string;
    };

    expect(response.status).toBe(200);
    expect(body.path).toBe(`/i/${body.assignmentId}`);
    expect(body.challengeIds).toEqual([
      "finance-peak-hour-switch",
      "finance-production-orchestrator",
    ]);
  });

  it("creates an assignment API link from ordinary levels", async () => {
    const response = await createAssignment(
      new Request("http://localhost/api/interview/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeIds: ["branching-maze", "straight-line"],
        }),
      }),
    );
    const body = (await response.json()) as {
      assignmentId: string;
      challengeIds: string[];
      path: string;
    };

    expect(response.status).toBe(200);
    expect(body.path).toBe(`/i/${body.assignmentId}`);
    expect(body.challengeIds).toEqual(["straight-line", "branching-maze"]);
  });

  it("opens the shared link on an interview-only challenge directory", async () => {
    const assignmentId = createInterviewAssignmentId([
      "parking-interview-operations",
      "parking-interview-orchestrator",
    ]);
    const page = await InterviewAssignmentPage({
      params: Promise.resolve({ assignmentId }),
      searchParams: Promise.resolve({}),
    });

    expect(page.type).toBe(InterviewAssignmentDirectoryPage);
    expect(page.props).toMatchObject({
      assignment: {
        id: assignmentId,
        challengeIds: [
          "parking-interview-operations",
          "parking-interview-orchestrator",
        ],
      },
      pack: { id: "parking" },
    });
    expect(page.props.challenges.map((challenge: { id: string }) => challenge.id))
      .toEqual([
        "parking-interview-operations",
        "parking-interview-orchestrator",
      ]);
  });

  it("opens a selected problem in the existing Studio workspace", async () => {
    const assignmentId = createInterviewAssignmentId([
      "parking-interview-operations",
      "parking-interview-orchestrator",
    ]);
    const page = await InterviewAssignmentChallengePage({
      params: Promise.resolve({
        assignmentId,
        challengeId: "parking-interview-operations",
      }),
    });

    expect(page.type).toBe(StudioPage);
    expect(page.props).toMatchObject({
      packId: "parking",
      challengeId: "parking-interview-operations",
      workspaceMode: "interview",
      interviewAssignment: {
        id: assignmentId,
        currentIndex: 0,
        challengeIds: [
          "parking-interview-operations",
          "parking-interview-orchestrator",
        ],
      },
    });
  });

  it("opens an ordinary selected level in the interview workspace", async () => {
    const assignmentId = createInterviewAssignmentId([
      "straight-line",
      "branching-maze",
    ]);
    const page = await InterviewAssignmentChallengePage({
      params: Promise.resolve({
        assignmentId,
        challengeId: "branching-maze",
      }),
    });

    expect(page.type).toBe(StudioPage);
    expect(page.props).toMatchObject({
      packId: "maze",
      challengeId: "branching-maze",
      workspaceMode: "interview",
      interviewAssignment: {
        id: assignmentId,
        currentIndex: 1,
        challengeIds: ["straight-line", "branching-maze"],
      },
    });
  });
});
