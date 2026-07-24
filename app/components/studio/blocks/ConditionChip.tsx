"use client";

/**
 * ConditionChip — an interactive chip representing one atom of a condition.
 *
 * Rendered inside the RuleBuilder's condition row. A chip can be:
 *   - A boolean flag chip: [wallAhead] or [!wallAhead]
 *   - A comparison chip: [energy < 20]
 *   - A removable chip with a × button
 */

import { ConditionAtom, ComparisonOp } from "@/lib/authoring/types";

export const BOOLEAN_FLAGS = [
  "wallAhead", "wallLeft", "wallRight",
  "goalVisible", "goalAhead", "atGoal",
  "visitedAhead", "always", "never",
] as const;

export const NUMERIC_FLAGS = ["energy", "visitedCount", "tick"] as const;
export const ALL_FLAGS = [...BOOLEAN_FLAGS, ...NUMERIC_FLAGS] as const;

export const FLAG_LABELS: Record<string, string> = {
  wallAhead: "Wall Ahead",
  wallLeft: "Wall Left",
  wallRight: "Wall Right",
  goalVisible: "Goal Visible",
  goalAhead: "Goal Ahead",
  atGoal: "At Goal",
  visitedAhead: "Visited Ahead",
  always: "Always",
  never: "Never",
  energy: "Energy",
  visitedCount: "Visited Count",
  tick: "Tick",
};

const COMPARISON_OPS: ComparisonOp[] = ["<", "<=", ">", ">=", "==", "!="];

interface Props {
  atom: ConditionAtom;
  availableFlags?: string[];
  onChange: (updated: ConditionAtom) => void;
  onRemove: () => void;
}

export function ConditionChip({ atom, availableFlags, onChange, onRemove }: Props) {
  const isNumeric = atom.comparison !== undefined;
  const flags = availableFlags ?? [...ALL_FLAGS];

  return (
    <div className="flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800">
      {/* Negation toggle (boolean flags only) — `!` matches real syntax */}
      {!isNumeric && (
        <button
          title={atom.negated ? "Remove negation (NOT)" : "Negate (NOT)"}
          onClick={() => onChange({ ...atom, negated: !atom.negated })}
          className={[
            "rounded px-1 font-mono font-bold transition-colors",
            atom.negated
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700",
          ].join(" ")}
        >
          !
        </button>
      )}

      {/* Flag selector */}
      <select
        value={atom.flag}
        onChange={(e) => {
          const newFlag = e.target.value;
          const willBeNumeric = (NUMERIC_FLAGS as readonly string[]).includes(newFlag);
          if (willBeNumeric && !atom.comparison) {
            onChange({ flag: newFlag, negated: false, comparison: { op: "<", value: 0 } });
          } else if (!willBeNumeric && atom.comparison) {
            onChange({ flag: newFlag, negated: atom.negated });
          } else {
            onChange({ ...atom, flag: newFlag });
          }
        }}
        className="border-0 bg-transparent font-medium text-zinc-800 focus:outline-none dark:text-zinc-100"
      >
        {flags.map((f) => (
          <option key={f} value={f}>{FLAG_LABELS[f] ?? f}</option>
        ))}
      </select>

      {/* Comparison controls (numeric flags) */}
      {isNumeric && atom.comparison && (
        <>
          <select
            value={atom.comparison.op}
            onChange={(e) =>
              onChange({ ...atom, comparison: { ...atom.comparison!, op: e.target.value as ComparisonOp } })
            }
            className="border-0 bg-transparent font-mono text-zinc-600 focus:outline-none dark:text-zinc-300"
          >
            {COMPARISON_OPS.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
          <input
            type="number"
            value={atom.comparison.value}
            onChange={(e) =>
              onChange({ ...atom, comparison: { ...atom.comparison!, value: Number(e.target.value) } })
            }
            className="w-14 border-0 bg-transparent text-right font-mono text-zinc-600 focus:outline-none dark:text-zinc-300"
          />
        </>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="ml-1 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        title="Remove condition"
      >
        ×
      </button>
    </div>
  );
}
