import { describe, expect, it } from "vitest";

import InterviewStagePage from "@/app/interview/[challengeId]/page";
import { CHALLENGES } from "@/content/challenges";
import { financeInterviewSuite } from "@/lib/interview/server/financeSuites";
import { parkingInterviewSuite } from "@/lib/interview/server/parkingSuites";

describe("shareable interview stages", () => {
  it("keeps every predictable legacy challenge URL revoked", async () => {
    await expect(
      InterviewStagePage({
        params: Promise.resolve({
          challengeId: "parking-interview-operations",
        }),
      }),
    ).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
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
