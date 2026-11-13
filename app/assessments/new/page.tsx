import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssessmentAuthorPage } from "@/features/assessment/author/AssessmentAuthorPage";
import { assessmentsEnabled } from "@/lib/assessment/flag";

export const metadata: Metadata = {
  title: "New codebase assessment — CTRL",
  robots: { index: false },
};

export default function NewAssessmentPage() {
  if (!assessmentsEnabled()) notFound();
  return <AssessmentAuthorPage />;
}
