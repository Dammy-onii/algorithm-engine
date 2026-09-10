"use client";

/**
 * TaskChecklist — the live "to-do list" a learner watches complete while the
 * simulation runs. Each step ticks from pending to done the moment its check
 * holds, turning an abstract objective into visible, incremental progress.
 *
 * Purely presentational: it receives already-evaluated StepResults (computed in
 * the shell from the live run context), so it stays world-agnostic.
 */

import { StepResult } from "@/lib/authoring/objectives";

interface Props {
  steps: StepResult[];
  /** Hide until the first run so the pre-run stage stays uncluttered. */
  started: boolean;
}

export function TaskChecklist({ steps, started }: Props) {
  if (steps.length === 0) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.filter((s) => !s.informational).length;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Task progress
        </h3>
        {started && total > 0 && (
          <span className="text-xs font-medium text-zinc-400">
            {doneCount}/{total}
          </span>
        )}
      </div>
      <p className="mb-2 text-xs leading-relaxed text-zinc-400">
        Use these steps as a checklist while you edit, run, and inspect the result.
      </p>
      <ul className="flex flex-col gap-1.5">
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-2 text-sm">
            <StepMark done={started && s.done} informational={s.informational} />
            <div className="min-w-0">
              <span
                className={[
                  "block leading-snug",
                  started && s.done
                    ? "text-zinc-400 line-through"
                    : "text-zinc-700 dark:text-zinc-300",
                ].join(" ")}
              >
                {s.label}
              </span>
              {s.hint && (
                <span className="mt-0.5 block text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                  {s.hint}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepMark({ done, informational }: { done: boolean; informational: boolean }) {
  if (informational) {
    return <span className="mt-0.5 text-zinc-300 dark:text-zinc-600">•</span>;
  }
  if (done) {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white dark:bg-zinc-100 dark:text-zinc-900">
        ✓
      </span>
    );
  }
  return (
    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-zinc-300 dark:border-zinc-600" />
  );
}
