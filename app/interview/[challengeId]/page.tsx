import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ challengeId: string }>;
}

/**
 * Revoked legacy interview route.
 *
 * Predictable challenge-id URLs could not be revoked. All interview sharing now
 * uses signed `/i/[assignmentId]` links, including a one-problem selection.
 * Keeping this route as an explicit 404 prevents an old direct link from being
 * reactivated accidentally while allowing a clear migration message in source.
 */
export default async function InterviewStagePage({ params }: Props) {
  await params;
  notFound();
}
