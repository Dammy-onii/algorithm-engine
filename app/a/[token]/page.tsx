import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssessmentWorkspace } from "@/features/assessment/workspace/AssessmentWorkspace";
import { assessmentsEnabled } from "@/lib/assessment/flag";
import { verifyLinkToken } from "@/lib/assessment/server/link";
import { toPublicAssessment } from "@/lib/assessment/server/service";
import { getAssessmentStore } from "@/lib/assessment/storage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Technical assessment — CTRL", robots: { index: false } };

interface Props {
  params: Promise<{ token: string }>;
}

/** Candidate entry point: /a/<signed token>. Hidden tests are stripped before rendering. */
export default async function CandidateAssessmentPage({ params }: Props) {
  if (!assessmentsEnabled()) notFound();
  const { token } = await params;
  const id = verifyLinkToken("candidate", token);
  if (!id) notFound();
  const assessment = await getAssessmentStore().getAssessment(id);
  if (!assessment) notFound();
  return <AssessmentWorkspace token={token} assessment={toPublicAssessment(assessment)} />;
}
