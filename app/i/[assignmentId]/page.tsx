import { notFound, redirect } from "next/navigation";

import { InterviewAssignmentDirectoryPage } from "@/features/engine/interview/pages/InterviewAssignmentDirectoryPage";
import { findPack, getChallenge } from "@/lib/content/registry";
import { interviewAssignmentProblemPath } from "@/lib/interview/assignmentRoutes";
import { resolveInterviewAssignment } from "@/lib/interview/server/assignmentToken";

interface Props {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ problem?: string | string[] }>;
}

/** Compact multi-problem interview overview. */
export default async function InterviewAssignmentPage({
  params,
  searchParams,
}: Props) {
  const { assignmentId } = await params;
  const assignment = resolveInterviewAssignment(assignmentId);
  if (!assignment) notFound();

  const challenges = assignment.challengeIds
    .map((challengeId) => getChallenge(challengeId))
    .filter((challenge) => challenge !== undefined);
  if (challenges.length !== assignment.challengeIds.length) notFound();
  const pack = findPack(challenges[0].pack);
  if (!pack) notFound();

  // Backwards compatibility for links created before nested problem routes.
  const query = await searchParams;
  const requestedProblem = Array.isArray(query.problem)
    ? query.problem[0]
    : query.problem;
  if (requestedProblem !== undefined) {
    const parsedIndex = Number.parseInt(requestedProblem, 10) - 1;
    const currentIndex = Number.isInteger(parsedIndex)
      ? Math.min(Math.max(parsedIndex, 0), challenges.length - 1)
      : 0;
    redirect(
      interviewAssignmentProblemPath(
        assignment.id,
        challenges[currentIndex].id,
      ),
    );
  }

  return (
    <InterviewAssignmentDirectoryPage
      assignment={assignment}
      pack={pack}
      challenges={challenges}
    />
  );
}
