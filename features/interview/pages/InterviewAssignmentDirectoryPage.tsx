import Link from "next/link";

import { PageLayout } from "@/features/application/components/PageLayout";
import {
  difficultyFor,
  type DifficultyBand,
} from "@/features/catalogue/difficulty";
import type { ChallengeData } from "@/lib/authoring/types";
import type { PackInfo } from "@/lib/content/registry";
import type { InterviewAssignment } from "@/lib/interview/assignment";
import { interviewAssignmentProblemPath } from "@/lib/interview/assignmentRoutes";

const DIFFICULTY_LABEL: Record<DifficultyBand, string> = {
  example: "Example",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const DIFFICULTY_COLOR: Record<DifficultyBand, string> = {
  example: "text-zinc-500",
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-red-600 dark:text-red-400",
};

interface Props {
  assignment: InterviewAssignment;
  pack: PackInfo;
  challenges: ChallengeData[];
}

/** Interview-only directory rendered by the compact shared assignment route. */
export function InterviewAssignmentDirectoryPage({
  assignment,
  pack,
  challenges,
}: Props) {
  const hiddenSuiteCount = challenges.filter(
    (challenge) => challenge.interviewEvaluation,
  ).length;

  return (
    <PageLayout
      title="Technical interview"
      subtitle={`${pack.title} · ${challenges.length} assigned ${
        challenges.length === 1 ? "problem" : "problems"
      }`}
      className="w-full"
    >
      <section className="mx-auto flex w-full flex-col gap-8 px-4 pb-12 sm:px-8 lg:px-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            Shared interview assignment
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Select an interview problem
          </h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Work through the assigned problems in order. Your work is saved
            separately for this interview link.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-6">
          <div className="col-span-4 flex min-w-0 flex-col gap-3">
            {challenges.map((challenge, index) => (
              <InterviewChallengeRow
                key={challenge.id}
                assignmentId={assignment.id}
                challenge={challenge}
                index={index}
              />
            ))}
          </div>

          <aside className="order-first col-span-2 rounded-xl border border-zinc-200 bg-white p-5 lg:order-last lg:sticky lg:top-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Interview details
            </h3>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <Detail label="Problems" value={String(challenges.length)} />
              <Detail label="Simulation" value={pack.title} />
              <Detail label="Link access" value="No scheduled expiry" />
              <Detail
                label="Hidden-suite problems"
                value={`${hiddenSuiteCount}/${challenges.length}`}
              />
            </dl>

            <div className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Interview problems
              </h3>
              <nav
                aria-label="Assigned interview problems"
                className="mt-3 flex flex-col gap-1"
              >
                {challenges.map((challenge, index) => (
                  <Link
                    key={challenge.id}
                    href={interviewAssignmentProblemPath(
                      assignment.id,
                      challenge.id,
                    )}
                    className="rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                  >
                    <span className="mr-2 font-mono text-xs text-zinc-400">
                      {index + 1}.
                    </span>
                    {challenge.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="mt-5 border-t border-zinc-200 pt-5 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800">
              <p>
                Apply &amp; Run evaluates every visible stage. Problems marked
                with a hidden suite also provide Interview Submit.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </PageLayout>
  );
}

function InterviewChallengeRow({
  assignmentId,
  challenge,
  index,
}: {
  assignmentId: string;
  challenge: ChallengeData;
  index: number;
}) {
  const difficulty = difficultyFor(challenge);
  const evaluation = challenge.interviewEvaluation;

  return (
    <Link
      href={interviewAssignmentProblemPath(assignmentId, challenge.id)}
      className="group flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white px-5 py-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 md:flex-row md:items-center md:justify-between md:px-7 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/70 dark:focus-visible:ring-zinc-100"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Problem {index + 1}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {challenge.name}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          <span className={`font-semibold ${DIFFICULTY_COLOR[difficulty]}`}>
            {DIFFICULTY_LABEL[difficulty]}
          </span>
          <span className="mx-2 text-zinc-300 dark:text-zinc-700">·</span>
          {evaluation
            ? `${evaluation.scenarioCount} hidden submission cases`
            : "Visible stage evaluation"}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{challenge.tagline}</p>
      </div>
      <span className="w-full shrink-0 rounded-lg border border-zinc-400 px-5 py-2.5 text-center text-sm font-medium text-zinc-700 transition-colors group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white md:w-auto md:min-w-40 dark:border-zinc-600 dark:text-zinc-200 dark:group-hover:border-zinc-100 dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900">
        Enter challenge
      </span>
    </Link>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0 dark:border-zinc-800">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}
