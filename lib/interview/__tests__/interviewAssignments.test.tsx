import { describe, expect, it } from "vitest";

import InterviewAssignmentPage from "@/app/i/[assignmentId]/page";
import { POST as createAssignment } from "@/app/api/interview/assignments/route";
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
  it("always includes the tutorial first and sorts by ascending difficulty", () => {
    const finance = normalizeInterviewSelection([
      "finance-production-orchestrator",
      "finance-peak-hour-switch",
    ]);

    expect(finance.map((challenge) => challenge.id)).toEqual([
      "finance-interview-routing",
      "finance-peak-hour-switch",
      "finance-production-orchestrator",
    ]);
    expect(finance[0].interviewEvaluation?.tutorial).toBe(true);

    expect(
      assignableChallengesInPack("parking").map((challenge) => challenge.id),
    ).toEqual([
      "parking-interview-controller",
      "parking-first-shift",
      "parking-match-vehicle",
      "parking-priority-access",
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

  it("creates a compact signed id and rejects a modified id", () => {
    const id = createInterviewAssignmentId([
      "parking-interview-orchestrator",
      "parking-interview-operations",
    ]);

    expect(id.length).toBeLessThan(24);
    expect(resolveInterviewAssignment(id)?.challengeIds).toEqual([
      "parking-interview-controller",
      "parking-interview-operations",
      "parking-interview-orchestrator",
    ]);

    const replacement = id.endsWith("A") ? "B" : "A";
    expect(resolveInterviewAssignment(`${id.slice(0, -1)}${replacement}`)).toBe(
      undefined,
    );
  });

  it("keeps same-number levels distinct by encoding their world", () => {
    const mazeId = createInterviewAssignmentId(["branching-maze"]);
    const warehouseId = createInterviewAssignmentId([
      "warehouse-first-delivery",
    ]);

    expect(resolveInterviewAssignment(mazeId)?.challengeIds).toEqual([
      "branching-maze",
    ]);
    expect(resolveInterviewAssignment(warehouseId)?.challengeIds).toEqual([
      "warehouse-first-delivery",
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
      "finance-interview-routing",
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

  it("resolves a requested problem into the existing Studio workspace", async () => {
    const assignmentId = createInterviewAssignmentId([
      "parking-interview-operations",
      "parking-interview-orchestrator",
    ]);
    const page = await InterviewAssignmentPage({
      params: Promise.resolve({ assignmentId }),
      searchParams: Promise.resolve({ problem: "2" }),
    });

    expect(page.type).toBe(StudioPage);
    expect(page.props).toMatchObject({
      packId: "parking",
      challengeId: "parking-interview-operations",
      workspaceMode: "interview",
      interviewAssignment: {
        id: assignmentId,
        currentIndex: 1,
        challengeIds: [
          "parking-interview-controller",
          "parking-interview-operations",
          "parking-interview-orchestrator",
        ],
      },
    });
  });

  it("opens an ordinary level in the interview workspace", async () => {
    const assignmentId = createInterviewAssignmentId([
      "straight-line",
      "branching-maze",
    ]);
    const page = await InterviewAssignmentPage({
      params: Promise.resolve({ assignmentId }),
      searchParams: Promise.resolve({ problem: "2" }),
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
