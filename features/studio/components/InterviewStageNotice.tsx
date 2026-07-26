import type { ChallengeData } from "@/lib/authoring/types";
import Link from "next/link";

import { getChallenge } from "@/lib/content/registry";
import type { InterviewAssignment } from "@/lib/interview/assignment";

export type InterviewAssignmentContext = InterviewAssignment & {
  currentIndex: number;
};

export function interviewAssignmentProblemPath(
  assignmentId: string,
  index: number,
): string {
  return index === 0
    ? `/i/${encodeURIComponent(assignmentId)}`
    : `/i/${encodeURIComponent(assignmentId)}?problem=${index + 1}`;
}

export function InterviewStageNotice({
  challenge,
  assignment,
}: {
  challenge: ChallengeData;
  assignment?: InterviewAssignmentContext;
}) {
  const evaluation = challenge.interviewEvaluation;
  const assignmentChallenges = assignment?.challengeIds
    .map((id) => getChallenge(id))
    .filter((item): item is ChallengeData => Boolean(item));

  return (
    <section className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Shared interview assignment
            {assignment &&
              ` · Problem ${assignment.currentIndex + 1} of ${assignment.challengeIds.length}`}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{challenge.name}</p>
          <p className="mt-0.5 text-xs text-emerald-800/75 dark:text-emerald-300/70">
            {evaluation
              ? "Apply & Run uses the visible stage. Submit runs the referenced server-only evaluation set."
              : "Apply & Run evaluates this visible stage. This level does not have a server-only hidden suite."}
          </p>
        </div>
        {evaluation && (
          <div className="flex gap-2 text-xs tabular-nums">
            <span className="rounded-md border border-emerald-200 bg-white/70 px-2 py-1 dark:border-emerald-900 dark:bg-black/15">
              {evaluation.scenarioCount} submission cases
            </span>
            <span className="rounded-md border border-emerald-200 bg-white/70 px-2 py-1 dark:border-emerald-900 dark:bg-black/15">
              Pass score {evaluation.passingScore}
            </span>
          </div>
        )}
      </div>

      {assignment && assignmentChallenges && (
        <nav
          aria-label="Interview assignment problems"
          className="mt-3 flex gap-2 overflow-x-auto border-t border-emerald-200 pt-3 dark:border-emerald-900/60"
        >
          {assignmentChallenges.map((item, index) => {
            const active = index === assignment.currentIndex;
            return (
              <Link
                key={item.id}
                href={interviewAssignmentProblemPath(assignment.id, index)}
                aria-current={active ? "step" : undefined}
                className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950"
                    : "border-emerald-200 bg-white/60 text-emerald-900 hover:border-emerald-500 dark:border-emerald-900 dark:bg-black/15 dark:text-emerald-200"
                }`}
              >
                {index + 1}. {item.name}
              </Link>
            );
          })}
        </nav>
      )}
    </section>
  );
}
