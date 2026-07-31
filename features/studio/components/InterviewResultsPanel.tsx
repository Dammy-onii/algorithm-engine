"use client";

import type {
  InterviewScenarioResult,
  InterviewSubmissionReport,
} from "@/lib/interview/types";

interface Props {
  report: InterviewSubmissionReport | null;
  submitting: boolean;
  error: string | null;
  scenarioCount: number;
  passingScore: number;
  liveScenarios: InterviewScenarioResult[];
  activeScenario: string | null;
  completedScenarios: number;
  onSubmit: () => void;
}

export function InterviewResultsPanel({
  report,
  submitting,
  error,
  scenarioCount,
  passingScore,
  liveScenarios,
  activeScenario,
  completedScenarios,
  onSubmit,
}: Props) {
  const visibleScenarios = report?.scenarios ?? liveScenarios;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Interview evaluation
          </p>
          <h3 className="mt-1 text-sm font-semibold">
            {scenarioCount} server-only scenarios
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500">
            The same compiled policy runs against unseen traffic, capacity,
            timing, compatibility, and failure scenarios.
            Passing requires every guardrail in every case and an average score
            of {passingScore}. A strong score cannot hide a safety or service-level
            failure.
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25"
        >
          {submitting ? "Evaluating…" : report ? "Submit again" : "Submit policy"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {submitting && (
        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold">
              {activeScenario
                ? `Running: ${activeScenario}`
                : "Preparing next hidden case…"}
            </span>
            <span className="font-mono text-zinc-500">
              {completedScenarios}/{scenarioCount}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-zinc-900 transition-[width] duration-300 dark:bg-emerald-400"
              style={{
                width: `${(completedScenarios / scenarioCount) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {report && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="Score" value={`${report.overallScore}/100`} />
            <Metric
              label="Cases"
              value={`${report.scenariosPassed}/${report.scenarioCount}`}
            />
            <Metric label="Result" value={report.passed ? "Pass" : "Revise"} />
          </div>
        </>
      )}

      {visibleScenarios.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {visibleScenarios.map((scenario) => (
              <details
                key={scenario.id}
                className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <summary className="cursor-pointer list-none text-xs font-semibold">
                  <span className={scenario.passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                    {scenario.passed ? "✓" : "×"}
                  </span>{" "}
                  {scenario.label}
                  <span className="float-right font-mono text-zinc-500">
                    {scenario.score}/100
                  </span>
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-500 sm:grid-cols-3">
                  {Object.entries(scenario.metrics).map(([label, value]) => (
                    <span key={label}>{label} {value}</span>
                  ))}
                </div>
                <div className="mt-2 overflow-hidden rounded border border-zinc-200 dark:border-zinc-700">
                  {scenario.guardrails.map((guardrail) => (
                    <div
                      key={guardrail.label}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-zinc-100 px-2 py-1.5 text-[10px] last:border-b-0 dark:border-zinc-800"
                    >
                      <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300">
                        {guardrail.label}
                      </span>
                      <span className="font-mono text-zinc-500">
                        {guardrail.actual} / {guardrail.required}
                      </span>
                      <span
                        className={
                          guardrail.passed
                            ? "font-semibold text-emerald-600 dark:text-emerald-400"
                            : "font-semibold text-red-600 dark:text-red-400"
                        }
                      >
                        {guardrail.passed ? "pass" : "fail"}
                      </span>
                    </div>
                  ))}
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-zinc-500">
                  {scenario.diagnostics.map((diagnostic) => (
                    <li key={diagnostic}>{diagnostic}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-100 p-2 dark:bg-zinc-800">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
