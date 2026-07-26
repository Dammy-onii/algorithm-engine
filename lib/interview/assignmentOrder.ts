import type { ChallengeData } from "@/lib/authoring/types";

const DIFFICULTY_ORDER = {
  tutorial: 0,
  practice: 0,
  easy: 1,
  medium: 2,
  hard: 3,
} as const;

export function isInterviewTutorial(challenge: ChallengeData): boolean {
  return challenge.interviewEvaluation?.tutorial === true;
}

function interviewDifficulty(challenge: ChallengeData): number {
  const authoredTier = challenge.taxonomy?.tier ?? challenge.stage;
  if (authoredTier) return DIFFICULTY_ORDER[authoredTier];
  if (challenge.difficulty === 1) return 0;
  if (challenge.difficulty === 2) return 1;
  if (challenge.difficulty === 3) return 2;
  return 3;
}

/**
 * The canonical order for an interview set:
 * guided tutorial, ascending difficulty, ascending grade, authored number.
 */
export function compareInterviewChallenges(
  left: ChallengeData,
  right: ChallengeData,
): number {
  const tutorialDifference =
    Number(isInterviewTutorial(right)) - Number(isInterviewTutorial(left));
  if (tutorialDifference !== 0) return tutorialDifference;

  const difficultyDifference =
    interviewDifficulty(left) - interviewDifficulty(right);
  if (difficultyDifference !== 0) return difficultyDifference;

  const gradeDifference =
    (left.taxonomy?.grade ?? left.difficulty) -
    (right.taxonomy?.grade ?? right.difficulty);
  if (gradeDifference !== 0) return gradeDifference;

  return left.number - right.number;
}
