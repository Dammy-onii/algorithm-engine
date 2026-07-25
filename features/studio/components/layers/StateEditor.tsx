"use client";

/**
 * StateEditor — visual editor for the States layer.
 *
 * States are fully user-owned: unlike the engine primitives, nothing here is
 * fixed. The challenge ships a starting set, but the user can rename them, add
 * new ones, delete them, and choose which one the robot starts in. This editor
 * makes that explicit and shows how each state is actually used by the rules
 * (which rules run in it, and which rules transition into it) so the tab is
 * informative even when a challenge only defines one state.
 */

import { VisualRule, VisualState } from "@/lib/authoring/types";

interface Props {
  states: VisualState[];
  initial: string;
  /** Read-only: used to explain how each state is referenced by the rules. */
  rules: VisualRule[];
  /**
   * Whether the user may author states. A state only becomes meaningful once a
   * challenge needs two modes, so earlier challenges present them read-only
   * rather than offering a control with no observable effect.
   */
  editable?: boolean;
  onStatesChange: (states: VisualState[]) => void;
  onInitialChange: (id: string) => void;
}

const FIELD =
  "rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

export function StateEditor({ states, initial, rules, editable = true, onStatesChange, onInitialChange }: Props) {
  const update = (index: number, patch: Partial<VisualState>) => {
    const next = states.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onStatesChange(next);
  };

  const add = () => {
    onStatesChange([...states, { id: `state-${states.length + 1}`, description: "" }]);
  };

  const remove = (index: number) => {
    const next = states.filter((_, i) => i !== index);
    onStatesChange(next);
    if (states[index].id === initial && next.length > 0) {
      onInitialChange(next[0].id);
    }
  };

  /** Rename a state and repoint the initial pointer if it was the initial one. */
  const rename = (index: number, newId: string) => {
    if (states[index].id === initial) onInitialChange(newId);
    update(index, { id: newId });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">
          What a state is
        </p>
        <p>
          A state is the robot&apos;s current <strong className="font-semibold text-zinc-700 dark:text-zinc-300">mode</strong>.
          Think of a phone: on <em>silent</em> a call vibrates, on <em>normal</em> the
          same call rings. Same event, different behaviour — because the mode changed.
        </p>

        <p className="mt-2">The robot works the same way. Say it has two modes:</p>
        <div className="my-1.5 flex flex-col gap-1 border-l-2 border-zinc-300 pl-3 dark:border-zinc-700">
          <div>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">explore</span>{" "}
            — the goal is not in sight. Rules here wander and follow walls.
          </div>
          <div>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">seek</span>{" "}
            — the goal is in sight. Rules here drive straight at it.
          </div>
        </div>
        <p>
          The robot senses &quot;the path ahead is clear&quot; in both modes — but in{" "}
          <span className="font-mono">explore</span> that means <em>keep wandering</em>,
          and in <span className="font-mono">seek</span> it means <em>close in on the
          goal</em>. That is the whole point: a state lets the same condition mean
          different things.
        </p>

        <p className="mt-2">
          The robot is always in exactly <strong className="font-semibold text-zinc-700 dark:text-zinc-300">one</strong>{" "}
          state. A rule only fires if its state matches. To change mode, a rule sets{" "}
          <span className="font-mono">Then switch to</span> — e.g. in{" "}
          <span className="font-mono">explore</span>, WHEN the goal becomes visible →
          DO step, then switch to <span className="font-mono">seek</span>.
        </p>

        {editable ? (
          <p className="mt-2">
            States are <strong className="font-semibold text-zinc-700 dark:text-zinc-300">yours to define</strong> —
            rename, add, delete them, and pick which one the robot starts in. They are
            not fixed by the engine.
          </p>
        ) : (
          <p className="mt-2">
            This challenge ships with the state(s) below, so you can focus on the rules.
            A state only earns its keep once a challenge needs <em>two</em> modes to tell
            apart — authoring your own unlocks then.
          </p>
        )}
      </div>

      {states.map((state, i) => {
        const isInitial = state.id === initial;
        const usedBy = rules.filter((r) => r.state === state.id);
        const enteredBy = rules.filter((r) => r.setState === state.id);

        return (
          <div
            key={i}
            className={[
              "flex flex-col gap-2 rounded-lg border p-3 transition-colors",
              isInitial
                ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800/50"
                : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <button
                title={isInitial ? "This is the initial state" : "Set as initial state"}
                onClick={() => editable && onInitialChange(state.id)}
                disabled={!editable}
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors",
                  isInitial
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-400 hover:border-zinc-500",
                ].join(" ")}
              >
                {isInitial ? "●" : "○"}
              </button>

              <input
                className={`${FIELD} flex-1 font-mono ${editable ? "" : "cursor-default opacity-70"}`}
                placeholder="state-id"
                value={state.id}
                readOnly={!editable}
                onChange={(e) => rename(i, e.target.value)}
              />

              {editable && states.length > 1 && !isInitial && (
                <button
                  onClick={() => remove(i)}
                  className="text-lg leading-none text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                  title="Remove state"
                >
                  ×
                </button>
              )}
            </div>

            <input
              className={`${FIELD} w-full ${editable ? "" : "cursor-default opacity-70"}`}
              placeholder="Description — what is this mode for?"
              value={state.description}
              readOnly={!editable}
              onChange={(e) => update(i, { description: e.target.value })}
            />

            {/* How this state is actually used by the rules */}
            <div className="flex flex-col gap-1 border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-800">
              {isInitial && (
                <span className="font-medium text-zinc-600 dark:text-zinc-400">
                  Initial state — the robot starts here.
                </span>
              )}
              <span>
                {usedBy.length === 0
                  ? "No rules run in this state yet."
                  : `Runs ${usedBy.length} rule${usedBy.length !== 1 ? "s" : ""}: `}
                {usedBy.length > 0 && (
                  <span className="font-mono text-zinc-600 dark:text-zinc-400">
                    {usedBy.map((r) => r.id).join(", ")}
                  </span>
                )}
              </span>
              {enteredBy.length > 0 && (
                <span>
                  Entered from:{" "}
                  <span className="font-mono text-zinc-600 dark:text-zinc-400">
                    {enteredBy.map((r) => r.id).join(", ")}
                  </span>
                </span>
              )}
            </div>
          </div>
        );
      })}

      {editable && (
      <button
        onClick={add}
        className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500"
      >
        + Add state
      </button>
      )}

      {states.length === 1 && (
        <p className="text-xs text-zinc-400">
          With only one state, the per-rule state controls stay hidden — add a second
          state to unlock &quot;In state&quot; and &quot;Then switch to&quot; on every rule.
        </p>
      )}
    </div>
  );
}
