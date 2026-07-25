"use client";

/**
 * ObjectivesPanel — the Objectives layer (formerly "Goals").
 *
 * Read-only checklist defined per challenge. A primary objective must pass to
 * complete the challenge; bonus objectives grade *quality* (fewer rules, fewer
 * ticks, energy saved) and give replay value. Results tick off after each run —
 * this is the scoring substrate later milestones build on.
 */

import { ChallengeObjective } from "@/lib/authoring/types";
import { ObjectiveResult } from "@/lib/authoring/objectives";

interface Props {
  objectives: ChallengeObjective[];
  /** Results from the most recent run, or null before the first run. */
  results: ObjectiveResult[] | null;
}

function Marker({ state }: { state: "met" | "unmet" | "pending" }) {
  const base = "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]";
  if (state === "met") {
    return (
      <span className={`${base} border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900`}>
        ✓
      </span>
    );
  }
  if (state === "unmet") {
    return <span className={`${base} border-zinc-300 text-zinc-300 dark:border-zinc-700`}>·</span>;
  }
  return <span className={`${base} border-dashed border-zinc-300 text-zinc-300 dark:border-zinc-700`} />;
}

export function ObjectivesPanel({ objectives, results }: Props) {
  if (objectives.length === 0) {
    return (
      <p className="text-sm italic text-zinc-400">
        This challenge has no scored objectives — just reach the goal.
      </p>
    );
  }

  const byId = new Map((results ?? []).map((r) => [r.id, r]));
  const primary = objectives.filter((o) => !o.bonus);
  const bonus = objectives.filter((o) => o.bonus);

  const Row = (o: ChallengeObjective) => {
    const r = byId.get(o.id);
    const state = !results ? "pending" : r?.met ? "met" : "unmet";
    return (
      <div key={o.id} className="flex items-start gap-2 py-1.5">
        <Marker state={state} />
        <div className="flex flex-col">
          <span
            className={[
              "text-sm",
              state === "met"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 dark:text-zinc-400",
            ].join(" ")}
          >
            {o.label}
          </span>
          <span className="font-mono text-[11px] text-zinc-400">{o.check}</span>
          {r?.error && (
            <span className="text-[11px] text-zinc-500">check error: {r.error}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">
          Objectives
        </p>
        <p>
          The <strong className="font-semibold text-zinc-700 dark:text-zinc-300">primary</strong>{" "}
          objective must pass to complete the challenge.{" "}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-300">Bonus</strong>{" "}
          objectives grade the <em>quality</em> of your algorithm — fewer rules, fewer
          ticks, energy saved. They tick off after each run.
        </p>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Primary
        </h3>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {primary.map(Row)}
        </div>
      </div>

      {bonus.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Bonus
          </h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {bonus.map(Row)}
          </div>
        </div>
      )}

      {!results && (
        <p className="text-xs text-zinc-400">Run the simulation to check objectives.</p>
      )}
    </div>
  );
}
