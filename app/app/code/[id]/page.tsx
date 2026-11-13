import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CodePracticeWorkspace } from "@/features/assessment/workspace/CodePracticeWorkspace";
import { getCodeProblem } from "@/lib/assessment/problems";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const problem = getCodeProblem((await params).id);
  return { title: problem ? `${problem.title} — CTRL` : "Code problem — CTRL" };
}

/** A code problem: read the brief, fix the project in the browser, run the tests. */
export default async function CodeProblemPage({ params }: Props) {
  const problem = getCodeProblem((await params).id);
  if (!problem) notFound();
  return <CodePracticeWorkspace problem={problem} />;
}
