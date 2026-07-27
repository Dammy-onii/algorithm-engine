import { notFound } from "next/navigation";

import { StudioPage } from "@/features/studio/pages/StudioPage";
import { getChallenge } from "@/lib/content/registry";
import { resolveInterviewAssignment } from "@/lib/interview/server/assignmentToken";

interface Props {
  params: Promise<{ assignmentId: string; challengeId: string }>;
}

/** One selected challenge inside a compact interview assignment. */
export default async function InterviewAssignmentChallengePage({
  params,
}: Props) {
  const { assignmentId, challengeId } = await params;
  const assignment = resolveInterviewAssignment(assignmentId);
  if (!assignment) notFound();

  const currentIndex = assignment.challengeIds.indexOf(challengeId);
  if (currentIndex < 0) notFound();
  const challenge = getChallenge(challengeId);
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
