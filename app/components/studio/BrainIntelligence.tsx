"use client";

/**
 * BrainIntelligence — a quiet, plain-English readout of what the current brain
 * does. Secondary to the editor: neutral zinc, compact, no loud color. It keeps
 * the editor legible for someone who has never seen the JSON format.
 */

import { VisualBrain } from "@/lib/authoring/types";
import { summarizeBrain } from "@/lib/authoring/brainSummarizer";

interface Props {
  brain: VisualBrain;
  intelligenceExplanation: string;
}

export function BrainIntelligence({ brain, intelligenceExplanation }: Props) {
  const summary = summarizeBrain(brain);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Current intelligence
        </h3>
        <span className="ml-auto rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-700">
          {summary.isEmpty
            ? "No rules"
            : `${summary.ruleCount} rule${summary.ruleCount !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* What the brain does right now */}
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{summary.overview}</p>

      {/* Per-rule breakdown */}
      {!summary.isEmpty && (
        <div className="flex flex-col gap-1">
          {summary.lines.map((line, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              {line.state && (
                <span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {line.state}
                </span>
              )}
              <span>{line.sentence}</span>
              <span className="ml-auto shrink-0 font-mono text-zinc-400">P{line.priority}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-200 dark:border-zinc-800" />

      {/* Challenge-specific guidance */}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{intelligenceExplanation}</p>

      {/* Quick stats */}
      <div className="flex gap-2 text-xs text-zinc-400">
        <span>{summary.stateCount} state{summary.stateCount !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{summary.ruleCount} rule{summary.ruleCount !== 1 ? "s" : ""}</span>
        {summary.functionCount > 0 && (
          <>
            <span>·</span>
            <span>{summary.functionCount} custom function{summary.functionCount !== 1 ? "s" : ""}</span>
          </>
        )}
      </div>
    </div>
  );
}
