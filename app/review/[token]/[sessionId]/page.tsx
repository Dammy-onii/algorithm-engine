import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageLayout } from "@/features/engine/application/components/PageLayout";
import { ReviewForm } from "@/features/assessment/review/ReviewForm";
import { SubmissionReplay } from "@/features/assessment/review/SubmissionReplay";
import { formatDate, formatDuration } from "@/features/assessment/review/format";
import { assessmentsEnabled } from "@/lib/assessment/flag";
import { verifyLinkToken } from "@/lib/assessment/server/link";
import { computeSessionStats } from "@/lib/assessment/stats";
import { getAssessmentStore } from "@/lib/assessment/storage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Submission — CTRL", robots: { index: false } };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default async function SubmissionPage({ params }: { params: Promise<{ token: string; sessionId: string }> }) {
  if (!assessmentsEnabled()) notFound();
  const { token, sessionId } = await params;
  const id = verifyLinkToken("review", token);
  if (!id) notFound();
  const store = getAssessmentStore();
  const [assessment, session] = await Promise.all([store.getAssessment(id), store.getSession(id, sessionId).catch(() => undefined)]);
  if (!assessment || !session) notFound();
  const stats = computeSessionStats(session, assessment);
  const hidden = session.hiddenTestResult;

  return (
    <PageLayout
      title={session.candidate.name}
      subtitle={`${session.candidate.email} · started ${formatDate(session.startedAt)}`}
      backLabel="All submissions"
      backHref={`/review/${token}`}
      className="max-w-6xl pb-16"
    >
      <div className="space-y-6 px-6 sm:px-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Status" value={session.status === "submitted" ? (session.late ? "Late" : "Submitted") : "In progress"} />
          <Stat label="Time spent" value={formatDuration(stats.durationMs)} />
          <Stat label="Test runs" value={stats.runCount} />
          <Stat label="First run" value={stats.timeToFirstRunMs === null ? "—" : formatDuration(stats.timeToFirstRunMs)} />
          <Stat label="Files changed" value={stats.filesChanged + stats.filesAdded + stats.filesDeleted} />
          <Stat label="Lines +/−" value={`+${stats.linesAdded} / −${stats.linesRemoved}`} />
        </div>

        <section className="rounded-lg border border-zinc-300 p-4 text-sm dark:border-zinc-700">
          <h2 className="font-semibold">Hidden tests</h2>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {hidden ? `${hidden.status.replace("_", " ")}${hidden.passed !== undefined ? ` — ${hidden.passed}/${hidden.total} passed` : ""}${hidden.detail ? `. ${hidden.detail}` : ""}` : "Not run yet (submission pending)."}
          </p>
          {Object.keys(assessment.hiddenTests).length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-blue-600">Show hidden test files to run yourself</summary>
              {Object.entries(assessment.hiddenTests).map(([path, code]) => (
                <div key={path} className="mt-2">
                  <div className="font-mono text-xs text-zinc-500">{path}</div>
                  <pre className="overflow-auto rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-900">{code}</pre>
                </div>
              ))}
            </details>
          )}
        </section>

        <SubmissionReplay snapshots={session.snapshots} />
        <ReviewForm token={token} sessionId={session.id} rubric={assessment.rubric} initial={session.review} />
      </div>
    </PageLayout>
  );
}
