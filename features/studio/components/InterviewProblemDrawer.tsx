import Link from "next/link";

import {
  difficultyFor,
  type DifficultyBand,
} from "@/features/catalogue/difficulty";
import type { ChallengeData } from "@/lib/authoring/types";
import { getChallenge } from "@/lib/content/registry";
import type { InterviewAssignment } from "@/lib/interview/assignment";
import {
  interviewAssignmentPath,
  interviewAssignmentProblemPath,
} from "@/lib/interview/assignmentRoutes";

export type InterviewAssignmentContext = InterviewAssignment & {
  currentIndex: number;
};

interface Props {
  challenge: ChallengeData;
  packTitle: string;
  assignment?: InterviewAssignmentContext;
  onClose: () => void;
}

/** Normal problem-list drawer structure populated only with interview data. */
export function InterviewProblemDrawer({
  challenge,
  packTitle,
  assignment,
  onClose,
}: Props) {
  const assignedChallenges = assignment
    ? assignment.challengeIds
        .map((id) => getChallenge(id))
        .filter((item): item is ChallengeData => Boolean(item))
    : [challenge];
  const currentIndex = assignment?.currentIndex ?? 0;
  const evaluation = challenge.interviewEvaluation;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Interview problems"
        className="flex h-full w-[min(92vw,31rem)] flex-col border-r border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#181818]"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold">Interview problems</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Problem {currentIndex + 1} of {assignedChallenges.length} ·{" "}
              {packTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close interview problems"
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ×
          </button>
        </div>

        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Interview details
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <InterviewDetail
              label="Current problem"
              value={`${currentIndex + 1}/${assignedChallenges.length}`}
            />
            <InterviewDetail label="Link access" value="No scheduled expiry" />
            <InterviewDetail
              label="Evaluation"
              value={evaluation ? "Visible + hidden" : "Visible stage"}
            />
            <InterviewDetail
              label="Submission"
              value={
                evaluation
                  ? `${evaluation.scenarioCount} cases · ${evaluation.passingScore}% pass`
                  : "Apply & Run"
              }
            />
          </dl>
          {assignment && (
            <Link
              href={interviewAssignmentPath(assignment.id)}
              onClick={onClose}
              className="mt-3 inline-flex text-xs font-semibold text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
            >
              View overview
            </Link>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-1">
            {assignedChallenges.map((item, index) => {
              const active = item.id === challenge.id;
              const difficulty = difficultyFor(item);
              const href = assignment
                ? interviewAssignmentProblemPath(assignment.id, item.id)
                : `/${encodeURIComponent(item.pack)}/${encodeURIComponent(item.id)}`;

              return (
                <Link
                  key={item.id}
                  href={href}
                  onClick={onClose}
                  aria-current={active ? "step" : undefined}
                  className={[
                    "flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left transition-colors",
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  ].join(" ")}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {index + 1}. {item.name}
                    </span>
                    <span
                      className={[
                        "mt-0.5 block text-xs",
                        active
                          ? "text-zinc-300 dark:text-zinc-600"
                          : "text-zinc-500",
                      ].join(" ")}
                    >
                      {item.interviewEvaluation
                        ? `${item.interviewEvaluation.scenarioCount} hidden cases`
                        : "Visible stage"}
                    </span>
                  </span>
                  <span
                    className={[
                      "shrink-0 text-xs font-semibold",
                      difficultyTone(difficulty, active),
                    ].join(" ")}
                  >
                    {difficultyLabel(difficulty)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function InterviewDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs font-medium text-zinc-800 dark:text-zinc-200">
        {value}
      </dd>
    </div>
  );
}

function difficultyLabel(difficulty: DifficultyBand) {
  if (difficulty === "example") return "Tutorial";
  return difficulty[0].toUpperCase() + difficulty.slice(1);
}

function difficultyTone(difficulty: DifficultyBand, active: boolean) {
  if (active) return "text-zinc-300 dark:text-zinc-600";
  if (difficulty === "example") {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (difficulty === "easy") return "text-teal-600 dark:text-teal-400";
  if (difficulty === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}
