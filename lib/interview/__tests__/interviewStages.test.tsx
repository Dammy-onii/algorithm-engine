import { describe, expect, it } from "vitest";

import InterviewStagePage from "@/app/interview/[challengeId]/page";
import { CHALLENGES } from "@/content/challenges";
import { StudioPage } from "@/features/studio/pages/StudioPage";
import { interviewSharePath } from "@/features/studio/components/ShareInterviewLink";
import { financeInterviewSuite } from "@/lib/interview/server/financeSuites";
import { parkingInterviewSuite } from "@/lib/interview/server/parkingSuites";

describe("shareable interview stages", () => {
  it("generates the dedicated interview URL from the challenge id", () => {
    expect(interviewSharePath("parking-interview-operations")).toBe(
      "/interview/parking-interview-operations",
    );
    expect(interviewSharePath("stage with spaces")).toBe(
      "/interview/stage%20with%20spaces",
    );
  });

  it("resolves the route directly from the existing challenge id", async () => {
    const page = await InterviewStagePage({
      params: Promise.resolve({
        challengeId: "parking-interview-operations",
      }),
    });

    expect(page.type).toBe(StudioPage);
    expect(page.props).toMatchObject({
      packId: "parking",
      challengeId: "parking-interview-operations",
      workspaceMode: "interview",
    });
  });

  it("references each challenge's existing suite without assignment copies", () => {
    const interviewChallenges = CHALLENGES.filter(
      (challenge) => challenge.interviewEvaluation,
    );
    expect(interviewChallenges).toHaveLength(6);

    for (const challenge of interviewChallenges) {
      const evaluation = challenge.interviewEvaluation!;
      const suite =
        challenge.pack === "finance"
          ? financeInterviewSuite(evaluation.suiteId)
          : challenge.pack === "parking"
            ? parkingInterviewSuite(evaluation.suiteId)
            : undefined;

      expect(suite, challenge.id).toBeDefined();
      expect(suite, challenge.id).toHaveLength(evaluation.scenarioCount);
    }
  });
});
