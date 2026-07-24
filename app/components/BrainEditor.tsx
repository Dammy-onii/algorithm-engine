"use client";

/**
 * Full brain editor — every layer of the agent's "engine" is editable here:
 * goals, states, rules, functions (bricks), and memory. Editing any layer and
 * pressing "Apply & Reset" rebuilds the whole brain and re-runs it on the same
 * simulation engine. This is the platform thesis made interactive: the engine is
 * fixed; the intelligence is data you author.
 */

export const BRAIN_LAYERS = [
  "goals",
  "states",
  "rules",
  "functions",
  "memory",
] as const;

export type BrainLayer = (typeof BRAIN_LAYERS)[number];

export type BrainTexts = Record<BrainLayer, string>;

const LAYER_META: Record<BrainLayer, { file: string; hint: string }> = {
  goals: {
    file: "goals.json",
    hint: "Priorities. Each goal has an id + priority; optional activeWhen condition.",
  },
  states: {
    file: "states.json",
    hint: "The modes of operation. Needs `initial` + a list of `states`.",
  },
  rules: {
    file: "rules.json",
    hint: "Reactions: when → do, plus optional state / setState / priority.",
  },
  functions: {
    file: "functions.json",
    hint: "Bricks. Single-step { action } or multi-step { steps: [...] } (compose other bricks).",
  },
  memory: {
    file: "memory.json",
    hint: "Initial memory object. Shown live in the debug panel.",
  },
};

const CONDITION_FLAGS =
  "wallAhead, wallLeft, wallRight, goalVisible, goalAhead, atGoal, visitedAhead, visitedCount, energy, tick, always, never";

export function BrainEditor({
  texts,
  active,
  onSelect,
  onChange,
  onApply,
  error,
  functionIds,
}: {
  texts: BrainTexts;
  active: BrainLayer;
  onSelect: (layer: BrainLayer) => void;
  onChange: (layer: BrainLayer, value: string) => void;
  onApply: () => void;
  error: string | null;
  functionIds: string[];
}) {
  const meta = LAYER_META[active];

  const tabBase =
    "rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-colors";
  const tabActive = "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900";
  const tabIdle =
    "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {BRAIN_LAYERS.map((layer) => (
            <button
              key={layer}
              className={`${tabBase} ${layer === active ? tabActive : tabIdle}`}
              onClick={() => onSelect(layer)}
            >
              {LAYER_META[layer].file}
            </button>
          ))}
        </div>
        <button
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          onClick={onApply}
        >
          Apply &amp; Reset
        </button>
      </div>

      <p className="mb-2 text-xs text-zinc-500">
        <span className="font-mono text-zinc-700 dark:text-zinc-300">
          {meta.file}
        </span>{" "}
        — {meta.hint}
        {active === "rules" ? (
          <>
            {" "}
            Condition flags: <code>{CONDITION_FLAGS}</code>. Available bricks:{" "}
            <code>{functionIds.join(", ")}</code>.
          </>
        ) : null}
      </p>

      <textarea
        className="h-72 w-full rounded-md border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        value={texts[active]}
        onChange={(e) => onChange(active, e.target.value)}
        spellCheck={false}
      />

      {error ? (
        <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-900 dark:text-zinc-100">
          <span className="font-semibold">Error · </span>
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-zinc-400">
          Edit any layer, then Apply &amp; Reset — the same engine runs your brain.
        </p>
      )}
    </section>
  );
}
