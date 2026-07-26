import type { ChallengeData } from "@/lib/authoring/types";
import { CHALLENGES } from "@/content/challenges";
import {
  compareInterviewChallenges,
  isInterviewTutorial,
} from "@/lib/interview/assignmentOrder";

export interface InterviewAssignment {
  id: string;
  challengeIds: string[];
}

/** Every published challenge in one world that may be placed in a shared set. */
export function assignableChallengesInPack(packId: string): ChallengeData[] {
  return CHALLENGES.filter(
    (challenge) => challenge.pack === packId,
  ).sort(compareInterviewChallenges);
}

/**
 * Resolve a user selection to a valid same-world assignment. A world may mark
 * one interview tutorial as required; when present, it is automatically
 * included first. Worlds without that marker may share any published levels.
 */
export function normalizeInterviewSelection(
  challengeIds: string[],
): ChallengeData[] {
  const uniqueIds = Array.from(new Set(challengeIds));
  if (uniqueIds.length === 0) {
    throw new Error("Select at least one problem for the interview assignment.");
  }

  const selected = uniqueIds.map((id) => {
    const challenge = CHALLENGES.find((candidate) => candidate.id === id);
    if (!challenge) {
      throw new Error(`'${id}' is not a published challenge.`);
    }
    return challenge;
  });

  const packId = selected[0].pack;
  if (selected.some((challenge) => challenge.pack !== packId)) {
    throw new Error("An interview assignment must use one world.");
  }

  const tutorial = assignableChallengesInPack(packId).find(isInterviewTutorial);
  const normalized = new Map(
    [...(tutorial ? [tutorial] : []), ...selected].map((challenge) => [
      challenge.id,
      challenge,
    ]),
  );
  return Array.from(normalized.values()).sort(compareInterviewChallenges);
}
