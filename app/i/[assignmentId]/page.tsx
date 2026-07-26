import { notFound } from "next/navigation";

import { StudioPage } from "@/features/studio/pages/StudioPage";
import { getChallenge } from "@/lib/content/registry";
import { resolveInterviewAssignment } from "@/lib/interview/server/assignmentToken";

interface Props {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ problem?: string | string[] }>;
}

/** Compact multi-problem interview assignment. */
export default async function InterviewAssignmentPage({
  params,
  searchParams,
}: Props) {
  const { assignmentId } = await params;
  const assignment = resolveInterviewAssignment(assignmentId);
  if (!assignment) notFound();

  const query = await searchParams;
  const requestedProblem = Array.isArray(query.problem)
    ? query.problem[0]
    : query.problem;
  const parsedIndex = Number.parseInt(requestedProblem ?? "1", 10) - 1;
  const currentIndex = Number.isInteger(parsedIndex)
    ? Math.min(Math.max(parsedIndex, 0), assignment.challengeIds.length - 1)
    : 0;
  const challenge = getChallenge(assignment.challengeIds[currentIndex]);
  if (!challenge) notFound();

  return (
    <StudioPage
      key={`${assignment.id}-${challenge.id}`}
      packId={challenge.pack}
      challengeId={challenge.id}
      workspaceMode="interview"
      interviewAssignment={{
        ...assignment,
        currentIndex,
      }}
    />
  );
}
