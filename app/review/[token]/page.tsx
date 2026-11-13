import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageLayout } from "@/features/engine/application/components/PageLayout";
import { formatDate, formatDuration } from "@/features/assessment/review/format";
import { assessmentsEnabled } from "@/lib/assessment/flag";
import { createLinkToken, verifyLinkToken } from "@/lib/assessment/server/link";
import { computeSessionStats } from "@/lib/assessment/stats";
import { getAssessmentStore } from "@/lib/assessment/storage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Assessment review — CTRL", robots: { index: false } };

const BADGE: Record<string, string> = {
  advance: "bg-green-100 text-green-800", hold: "bg-amber-100 text-amber-800", reject: "bg-rose-100 text-rose-800",
};

export default async function ReviewIndexPage({ params }: { params: Promise<{ token: string }> }) {
  if (!assessmentsEnabled()) notFound();
  const { token } = await params;
  const id = verifyLinkToken("review", token);
  if (!id) notFound();
  const store = getAssessmentStore();
  const assessment = await store.getAssessment(id);
  if (!assessment) notFound();
  const sessions = await store.listSessions(id);
  const maxScore = assessment.rubric.reduce((sum, c) => sum + c.maxScore, 0);

  return (
    <PageLayout title={assessment.title} subtitle="Candidate submissions" className="max-w-5xl pb-16">
      <div className="space-y-4 px-6 sm:px-10">
        <p className="text-xs text-zinc-500">
          Candidate link: <code className="font-mono">/a/{createLinkToken("candidate", id)}</code>
        </p>
        {sessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No one has started this assessment yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500">
              <tr><th className="py-2">Candidate</th><th>Status</th><th>Time</th><th>Test runs</th><th>Hidden tests</th><th>Review</th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const stats = computeSessionStats(s, assessment);
                const scored = s.review ? Object.values(s.review.scores).reduce((a, b) => a + b, 0) : null;
                return (
                  <tr key={s.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-3">
                      <Link href={`/review/${token}/${s.id}`} className="font-medium text-blue-600 hover:underline">{s.candidate.name}</Link>
                      <div className="text-xs text-zinc-500">{s.candidate.email} · started {formatDate(s.startedAt)}</div>
                    </td>
                    <td>{s.status === "submitted" ? (s.late ? "Submitted (late)" : "Submitted") : "In progress"}</td>
                    <td>{formatDuration(stats.durationMs)}</td>
                    <td>{stats.runCount}</td>
                    <td className="text-xs">{s.hiddenTestResult?.status.replace("_", " ") ?? "—"}</td>
                    <td>
                      {s.review ? (
                        <span className="flex items-center gap-2">
                          <span className="font-mono">{scored}/{maxScore}</span>
                          {s.review.recommendation && <span className={`rounded-full px-2 py-0.5 text-xs ${BADGE[s.review.recommendation]}`}>{s.review.recommendation}</span>}
                        </span>
                      ) : <span className="text-zinc-400">Not reviewed</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PageLayout>
  );
}
