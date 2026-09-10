"use client";

/**
 * ConditionEditor — the Conditions layer.
 *
 * Two halves:
 *   1. Engine flags — read-only reference. What the robot can *sense*. Fixed:
 *      you cannot author a new sense, only recombine existing ones.
 *   2. Your conditions — user-defined named expressions ("derived conditions").
 *      This is the perceptual mirror of composing multi-step bricks: it extends
 *      the vocabulary without adding new perception.
 */

import { useState } from "react";
import { VisualDerivedCondition } from "@/lib/authoring/types";
import { allDomainFlagSpecs } from "@/lib/engine/worlds/registry";
import { ConditionExpressionInput } from "./ConditionExpressionInput";

const FIELD =
  "rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

/** Reference documentation for every flag the engine provides. */
const FLAG_DOCS: { id: string; type: "bool" | "number"; meaning: string }[] = [
  { id: "wallAhead", type: "bool", meaning: "Wall or grid edge directly in front (relative to facing)" },
  { id: "wallLeft", type: "bool", meaning: "Wall or grid edge immediately to the left" },
  { id: "wallRight", type: "bool", meaning: "Wall or grid edge immediately to the right" },
  { id: "goalVisible", type: "bool", meaning: "Clear straight line to the goal down a corridor" },
  { id: "goalAhead", type: "bool", meaning: "goalVisible AND the goal lies straight ahead" },
  { id: "atGoal", type: "bool", meaning: "Standing on the goal tile right now" },
  { id: "visitedAhead", type: "bool", meaning: "The tile directly ahead has already been visited" },
  { id: "visitedCount", type: "number", meaning: "How many distinct tiles have been visited" },
  { id: "energy", type: "number", meaning: "Remaining energy (infinite if the world has none)" },
  { id: "tick", type: "number", meaning: "Current simulation tick" },
  { id: "always", type: "bool", meaning: "Constant true — the fallback case" },
  { id: "never", type: "bool", meaning: "Constant false" },
];
const ALL_FLAG_DOCS = [...FLAG_DOCS, ...allDomainFlagSpecs()];

interface Props {
  derived: VisualDerivedCondition[];
  /** Flags this challenge exposes in the guided rule builder. */
  availableConditions: string[];
  onChange: (derived: VisualDerivedCondition[]) => void;
}

export function ConditionEditor({ derived, availableConditions, onChange }: Props) {
  const [newId, setNewId] = useState("");
  const [newExpr, setNewExpr] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const available = new Set(availableConditions);
  // Only this challenge's flags are documented; other worlds' vocabulary never
  // leaks in. Derived conditions the user has named are usable too.
  const challengeFlagDocs = ALL_FLAG_DOCS.filter((f) => available.has(f.id));
  const suggestions = [
    ...availableConditions,
    ...derived.map((d) => d.id).filter((id) => id.trim()),
  ].filter((v, i, a) => a.indexOf(v) === i);

  /** Append a flag token to the composer expression (click-to-write). */
  const insertToken = (token: string) =>
    setNewExpr((expression) => {
      const current = expression.trimEnd();
      if (!current) return token;
      if (/(?:&&|\|\||!|\()\s*$/.test(current)) {
        return `${current} ${token}`;
      }
      return `${current} && ${token}`;
    });

  const add = () => {
    if (!newId.trim() || !newExpr.trim()) return;
    onChange([
      ...derived,
      { id: newId.trim(), expr: newExpr.trim(), description: newDesc.trim() },
    ]);
    setNewId("");
    setNewExpr("");
    setNewDesc("");
  };

  const update = (index: number, patch: Partial<VisualDerivedCondition>) =>
    onChange(derived.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const remove = (index: number) => onChange(derived.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">
          What a condition is
        </p>
        <p>
          A condition is a <em>fact the robot can sense right now</em>, recomputed
          every tick. Rules use them in their <span className="font-mono">WHEN</span>.
        </p>
        <p className="mt-1.5">
          The engine flags below are fixed — you cannot invent a new sense. But you{" "}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-300">can name
          combinations of them</strong>, which becomes new shared vocabulary:{" "}
          <span className="font-mono">deadEnd = wallAhead &amp;&amp; wallLeft &amp;&amp; wallRight</span>.
          That is to perception what composing a multi-step brick is to action.
        </p>
      </div>

      {/* 1 — Engine flags (read-only reference) — only this challenge's senses */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Engine flags · locked (what the robot can sense here)
        </h3>
        {challengeFlagDocs.length === 0 ? (
          <p className="text-sm italic text-zinc-400">
            This challenge exposes no sensing flags yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {challengeFlagDocs.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="py-1.5 pr-3 align-top">
                      <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                        {f.id}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 align-top font-mono text-zinc-400">
                      {f.type}
                    </td>
                    <td className="py-1.5 align-top text-zinc-500">{f.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2 — User-defined conditions */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Your conditions
        </h3>

        {derived.length === 0 ? (
          <p className="text-sm italic text-zinc-400">
            None yet. Name a combination below and it becomes usable in any rule.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {derived.map((d, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border border-zinc-400 bg-white p-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-2">
                  <input
                    className={`${FIELD} w-40 font-mono font-semibold`}
                    value={d.id}
                    placeholder="name"
                    onChange={(e) => update(i, { id: e.target.value })}
                  />
                  <span className="text-zinc-400">=</span>
                  <ConditionExpressionInput
                    value={d.expr}
                    placeholder="wallAhead && wallLeft && wallRight"
                    suggestions={suggestions}
                    onChange={(expr) => update(i, { expr })}
                  />
                  <button
                    onClick={() => remove(i)}
                    className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                    title="Remove condition"
                  >
                    ×
                  </button>
                </div>
                <input
                  className={`${FIELD} w-full text-xs`}
                  value={d.description}
                  placeholder="What does this mean? (optional)"
                  onChange={(e) => update(i, { description: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          <span>Condition operators and examples</span>
          <span className="text-xs font-normal text-zinc-400 group-open:hidden">
            Show
          </span>
          <span className="hidden text-xs font-normal text-zinc-400 group-open:inline">
            Hide
          </span>
        </summary>
        <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-700">
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <OperatorHelp
              operator="&&"
              meaning="AND — both sides must be true"
              example="canRouteA && isPriority"
            />
            <OperatorHelp
              operator="||"
              meaning="OR — either side may be true"
              example="canRouteA || canRouteB"
            />
            <OperatorHelp
              operator="!"
              meaning="NOT — invert a boolean fact"
              example="!wallAhead"
            />
            <OperatorHelp
              operator="( )"
              meaning="Group expressions before combining them"
              example="(canRouteA || canRouteB) && isPriority"
            />
            <OperatorHelp
              operator="<  <=  >  >="
              meaning="Compare numeric facts"
              example="deadlineRemaining <= 2"
            />
            <OperatorHelp
              operator="==  !="
              meaning="Test equality or inequality"
              example="retryCount != 0"
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Boolean facts such as <code>wallAhead</code> can stand alone.
            Numeric facts such as <code>queueDepth</code> need a comparison when
            you want a true/false result. Derived condition names can be reused
            inside later expressions.
          </p>
        </div>
      </details>

      {/* 3 — Composer */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Define a new condition
        </h3>
        <div className="mb-2 flex items-center gap-2">
          <input
            className={`${FIELD} w-40 font-mono`}
            placeholder="deadEnd"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
          />
          <span className="text-zinc-400">=</span>
          <ConditionExpressionInput
            placeholder="wallAhead && wallLeft && wallRight"
            value={newExpr}
            suggestions={suggestions}
            onChange={setNewExpr}
          />
        </div>

        {/* Autocomplete: click an existing condition to write it into the expression */}
        {suggestions.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[11px] uppercase tracking-wide text-zinc-400">Insert</span>
            {suggestions.map((flag) => (
              <button
                key={flag}
                type="button"
                onClick={() => insertToken(flag)}
                className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                title={`Insert ${flag}`}
              >
                {flag}
              </button>
            ))}
          </div>
        )}

        <input
          className={`${FIELD} mb-3 w-full text-xs`}
          placeholder="Description (optional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
        />
        <button
          onClick={add}
          disabled={!newId.trim() || !newExpr.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Save condition
        </button>
        <p className="mt-2 text-xs text-zinc-400">
          Operators: <span className="font-mono">&amp;&amp; || ! ( )</span> and{" "}
          <span className="font-mono">&lt; &gt; &lt;= &gt;= == !=</span>. Conditions may
          reference other conditions. Errors are reported on Apply &amp; Run.
        </p>
      </div>

    </div>
  );
}

function OperatorHelp({
  operator,
  meaning,
  example,
}: {
  operator: string;
  meaning: string;
  example: string;
}) {
  return (
    <div className="rounded-md bg-zinc-50 p-2.5 dark:bg-zinc-800/70">
      <div className="flex items-start gap-2">
        <code className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
          {operator}
        </code>
        <span className="text-zinc-600 dark:text-zinc-300">{meaning}</span>
      </div>
      <code className="mt-2 block overflow-x-auto text-[11px] text-zinc-500 dark:text-zinc-400">
        {example}
      </code>
    </div>
  );
}
