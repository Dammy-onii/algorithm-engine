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
import { ConditionFlagPicker } from "./ConditionFlagPicker";
import {
  ALL_FLAGS,
  DOMAIN_FLAGS,
  NUMERIC_FLAGS,
} from "./conditionFlags";

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
  const numericFlagIds = new Set([
    ...NUMERIC_FLAGS,
    ...DOMAIN_FLAGS.filter((flag) => flag.type === "number").map(
      (flag) => flag.id,
    ),
  ]);
  const numericFlags = flags.filter((flag) => numericFlagIds.has(flag));

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

      {/* Searchable, grouped flag selector */}
      <ConditionFlagPicker
        value={atom.flag}
        flags={flags}
        onSelect={(newFlag) => {
          const willBeNumeric = [...NUMERIC_FLAGS, ...DOMAIN_FLAGS.filter((flag) => flag.type === "number").map((flag) => flag.id)].includes(newFlag);
          if (willBeNumeric && !atom.comparison) {
            onChange({ flag: newFlag, negated: false, comparison: { op: "<", value: 0 } });
          } else if (!willBeNumeric && atom.comparison) {
            onChange({ flag: newFlag, negated: atom.negated });
          } else {
            onChange({ ...atom, flag: newFlag });
          }
        }}
      />

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
          {typeof atom.comparison.value === "number" ? (
            <>
              <input
                type="number"
                value={atom.comparison.value}
                onChange={(e) =>
                  onChange({
                    ...atom,
                    comparison: {
                      ...atom.comparison!,
                      value: Number(e.target.value),
                    },
                  })
                }
                className="w-14 border-0 bg-transparent text-right font-mono text-zinc-600 focus:outline-none dark:text-zinc-300"
              />
              {numericFlags.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...atom,
                      comparison: {
                        ...atom.comparison!,
                        value:
                          numericFlags.find((flag) => flag !== atom.flag) ??
                          numericFlags[0],
                      },
                    })
                  }
                  className="rounded px-1 text-[9px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                  title="Compare with another live fact"
                >
                  fact
                </button>
              )}
            </>
          ) : (
            <>
              <ConditionFlagPicker
                value={atom.comparison.value}
                flags={numericFlags}
                onSelect={(value) =>
                  onChange({
                    ...atom,
                    comparison: { ...atom.comparison!, value },
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...atom,
                    comparison: { ...atom.comparison!, value: 0 },
                  })
                }
                className="rounded px-1 text-[9px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                title="Compare with a fixed number"
              >
                number
              </button>
            </>
          )}
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
