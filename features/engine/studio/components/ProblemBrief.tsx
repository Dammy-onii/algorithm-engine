"use client";

/**
 * ProblemBrief — the complete problem statement shown before the solution UI.
 *
 * The authored narrative, scenario, learning context, and interview contract
 * stay visible so the candidate does not have to discover the actual task
 * behind progressive disclosure. Hints remain optional and reveal one at a
 * time.
 *
 * Driven entirely by the normalized brief, so maze, warehouse and finance
 * challenges all render the same flow.
 */

import { useState } from "react";
import { ChallengeData } from "@/lib/authoring/types";
import {
  normalizeBrief,
  paragraphsFromText,
  tableFromParagraph,
  taxonomyFor,
} from "@/lib/authoring/challengeBrief";

interface Props {
  challenge: ChallengeData;
  /** Failed-run count on this challenge — nudges the hints drawer open. */
  attempts: number;
}

export function ProblemBrief({ challenge, attempts }: Props) {
  const brief = normalizeBrief(challenge);
  const tax = taxonomyFor(challenge);
  const [revealedHints, setRevealedHints] = useState(0);

  const nudge = attempts >= 2 && revealedHints === 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Badge + title */}
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
          {tax.badge}
        </span>
        <span className="text-[11px] font-medium text-zinc-400">
          {challenge.number}. {challenge.name}
        </span>
      </div>

      {/* Headline — what to do (always visible) */}
      <h2 className="mt-2 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
        {brief.headline}
      </h2>
      {/* One line of scenario framing */}
      <div className="mt-3 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/40">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Scenario
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {brief.context}
        </p>
      </div>

      {/* The complete authored statement remains visible. */}
      {(brief.detail.length > 0 ||
        brief.learn ||
        challenge.interviewEvaluation) && (
        <div className="mt-4 flex flex-col gap-3 border-l-2 border-zinc-200 pl-3 dark:border-zinc-700">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Problem statement
          </p>
          {brief.detail.flatMap(paragraphsFromText).map((para, i) => (
            <Passage key={i} text={para} />
          ))}
          {brief.learn && (
            <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                What this teaches
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {brief.learn}
              </p>
            </div>
          )}
          {challenge.interviewEvaluation && (
            <div className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                Evaluation contract
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {challenge.interviewEvaluation.rubric.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Hints drawer */}
      {brief.hints.length > 0 && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {revealedHints > 0 && (
            <div className="mb-2 flex flex-col gap-2">
              {brief.hints.slice(0, revealedHints).map((h, i) => (
                <div
                  key={i}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <span className="font-medium text-zinc-500">
                    Hint {brief.hints.length > 1 ? `${i + 1} · ` : "· "}
                  </span>
                  {h}
                </div>
              ))}
            </div>
          )}
          {revealedHints < brief.hints.length && (
            <button
              onClick={() => setRevealedHints((n) => n + 1)}
              className={[
                "text-xs font-medium underline-offset-2 transition-colors hover:underline",
                nudge
                  ? "text-zinc-700 dark:text-zinc-200"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
              ].join(" ")}
            >
              {revealedHints === 0
                ? nudge
                  ? "Stuck? Show a hint"
                  : "Show a hint"
                : "Show another hint"}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
        <span aria-hidden="true">↓</span>
        <span>Scroll down to build and test your solution.</span>
      </div>
    </div>
  );
}

/**
 * One brief paragraph: a data table when it is written as a pipe table, plain
 * prose otherwise.
 */
function Passage({ text }: { text: string }) {
  const table = tableFromParagraph(text);
  if (!table) {
    return (
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{text}</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {table.head.map((cell, i) => (
              <th
                key={i}
                scope="col"
                className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={`px-2 py-1.5 text-zinc-600 dark:text-zinc-400 ${c === 0 ? "font-medium text-zinc-800 dark:text-zinc-200" : "font-mono"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
