import { notFound } from "next/navigation";

import { StudioPage } from "@/features/studio/pages/StudioPage";
import { getChallenge } from "@/lib/content/registry";

interface Props {
  params: Promise<{ challengeId: string }>;
}

/**
 * Shareable interview stage.
 *
 * The challenge id is the assignment reference: its existing worldKey provides
 * the visible case and interviewEvaluation.suiteId provides the hidden set.
 */
export default async function InterviewStagePage({ params }: Props) {
  const { challengeId } = await params;
  const challenge = getChallenge(challengeId);

  if (!challenge?.interviewEvaluation) notFound();

  return (
    <StudioPage
      key={`interview-${challenge.id}`}
      packId={challenge.pack}
      challengeId={challenge.id}
      workspaceMode="interview"
    />
  );
}
