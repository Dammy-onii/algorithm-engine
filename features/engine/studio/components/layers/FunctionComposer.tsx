"use client";

/**
 * FunctionComposer — visual editor for the Functions layer.
 *
 * This is the Level 2 unlock. Users compose new multi-step bricks by
 * sequencing engine primitives (and other user functions) into a named
 * behavior. Built-in primitive wrappers are shown but locked.
 *
 * New functions appear immediately in the RuleBuilder's brick palette.
 */

import { useState } from "react";
import { VisualFunction } from "@/lib/authoring/types";
import { BUILTIN_BRICK_DOCS, brickDoc } from "@/lib/authoring/bricks";
import { PrimitiveBlock } from "../blocks/PrimitiveBlock";

const FIELD = "rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

interface Props {
  functions: VisualFunction[];
  /** Brick ids this challenge exposes to the rule palette. */
  availableBricks: string[];
  /** Whether the user may compose new functions (Level 2 unlock). */
  composable: boolean;
  onChange: (functions: VisualFunction[]) => void;
}

export function FunctionComposer({ functions, availableBricks, composable, onChange }: Props) {
  const [newId, setNewId] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSteps, setNewSteps] = useState<string[]>([]);

  const builtIn = functions.filter((f) => f.isBuiltIn);
  const userFns = functions.filter((f) => !f.isBuiltIn);

  const addStep = (id: string) => setNewSteps((prev) => [...prev, id]);
  const removeStep = (index: number) => setNewSteps((prev) => prev.filter((_, i) => i !== index));

  const saveFunction = () => {
    if (!newId.trim() || newSteps.length === 0) return;
    const fn: VisualFunction = {
      id: newId.trim(),
      description: newDesc.trim(),
      steps: newSteps,
      isBuiltIn: false,
    };
    onChange([...functions, fn]);
    setNewId("");
    setNewDesc("");
    setNewSteps([]);
  };

  const removeUserFn = (id: string) => onChange(functions.filter((f) => f.id !== id));

  // The default bricks this challenge exposes, documented. Falls back to the
  // brain's built-in functions if the challenge doesn't specify a palette.
  const defaultBrickIds =
    availableBricks.length > 0
      ? availableBricks
      : builtIn.map((f) => f.id);

  // Build the step palette from the challenge's actual primitive wrappers.
  // This includes world actions such as Finance routing and Parking allocation.
  const stepPrimitives = defaultBrickIds
    .map((id) => builtIn.find((fn) => fn.id === id))
    .filter(
      (fn): fn is VisualFunction & { action: string } =>
        Boolean(fn?.action),
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">
          What a function is
        </p>
        <p>
          A function is an action you can use in the DO part of a rule. The ones
          below come with this challenge.{" "}
          {composable
            ? "You can also join them into your own multi-step functions below."
            : "Joining them into your own multi-step functions unlocks in a later challenge."}
        </p>
      </div>

      {/* Default bricks available in this challenge (always listed + explained) */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Functions in this challenge
        </h3>
        <div className="flex flex-col gap-1.5">
          {defaultBrickIds.map((id) => {
            const authoredDefinition = builtIn.find((fn) => fn.id === id);
            const fallbackDoc = brickDoc(id);
            const action = authoredDefinition?.action ?? fallbackDoc.action;
            const description =
              authoredDefinition?.description || fallbackDoc.description;
            const isBuiltin =
              authoredDefinition?.isBuiltIn ?? id in BUILTIN_BRICK_DOCS;
            return (
              <div
                key={id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <span className="w-24 shrink-0 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {id}
                </span>
                <span className="shrink-0 text-xs text-zinc-400">
                  {isBuiltin ? `→ ${action}` : "your function"}
                </span>
                <span className="text-xs text-zinc-500">{description}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-step functions currently present in the brain */}
      {composable && userFns.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Composed functions
          </h3>
          <p className="mb-2 text-xs text-zinc-500">
            Reusable multi-step functions currently saved in this brain.
          </p>
          <div className="flex flex-col gap-2">
            {userFns.map((fn) => (
              <div
                key={fn.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-400 bg-white p-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              >
                <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {fn.id}
                </span>
                <span className="text-zinc-400">→</span>
                <div className="flex flex-wrap gap-1">
                  {(fn.steps ?? []).map((step, i) => (
                    <PrimitiveBlock
                      key={i}
                      actionType={step}
                      engineOwned={builtIn.some((item) => item.id === step)}
                      compact
                    />
                  ))}
                </div>
                {fn.description && (
                  <span className="ml-auto text-xs text-zinc-400">{fn.description}</span>
                )}
                <button
                  onClick={() => removeUserFn(fn.id)}
                  className="ml-1 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                  title="Delete function"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Composer (Level 2 unlock) */}
      {composable && (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Compose a new function
        </h3>

        <div className="mb-3 flex gap-2">
          <input
            className={`${FIELD} flex-1`}
            placeholder="Function name, e.g. turn-and-step"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
          />
          <input
            className={`${FIELD} flex-1`}
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
        </div>

        {/* Step palette — click to append */}
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-zinc-500">Click a primitive to add it as a step:</p>
          <div className="flex flex-wrap gap-2">
            {stepPrimitives.map((p) => (
              <PrimitiveBlock
                key={p.id}
                actionType={p.action}
                engineOwned
                onClick={() => addStep(p.id)}
              />
            ))}
            {/* Also add any existing user functions as reusable steps */}
            {userFns.map((fn) => (
              <button
                key={fn.id}
                onClick={() => addStep(fn.id)}
                className="flex items-center gap-1 rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {fn.id}
              </button>
            ))}
          </div>
        </div>

        {/* Step sequence */}
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-zinc-500">
            Sequence ({newSteps.length} step{newSteps.length !== 1 ? "s" : ""} — executed one per tick):
          </p>
          <div className="flex min-h-8 flex-wrap items-center gap-1 rounded border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-800">
            {newSteps.length === 0 ? (
              <span className="text-xs text-zinc-300">Click a primitive above to add steps…</span>
            ) : (
              newSteps.map((step, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  <PrimitiveBlock
                    actionType={step}
                    engineOwned={builtIn.some((item) => item.id === step)}
                    compact
                  />
                  <button
                    onClick={() => removeStep(i)}
                    className="text-xs text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <button
          onClick={saveFunction}
          disabled={!newId.trim() || newSteps.length === 0}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Save function
        </button>
      </div>
      )}
    </div>
  );
}
