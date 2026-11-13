import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PracticePreview } from "@/features/assessment/workspace/PracticePreview";
import { getCodeProblem } from "@/lib/assessment/problems";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const problem = getCodeProblem((await params).id);
  return { title: problem ? `Preview: ${problem.title} — CTRL` : "Preview — CTRL" };
}

/**
 * The app being built in a code problem, full size in its own tab. Shows the work saved in
 * this browser and follows edits made in the workspace tab.
 */
export default async function CodeProblemPreviewPage({ params }: Props) {
  const problem = getCodeProblem((await params).id);
  if (!problem) notFound();
  return <PracticePreview problem={problem} />;
}
