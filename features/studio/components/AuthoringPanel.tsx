"use client";

/**
 * AuthoringPanel — the five-layer brain editor for the Intelligence Studio.
 *
 * Hierarchy (top → bottom, primary surface = the editor):
 *   1. Challenge header — compact: level, title, narrative, objective, hint
 *   2. Current Intelligence — quiet, secondary plain-English summary
 *   3. Layer editor — the primary editing surface (tabs + active layer)
 *   4. Run bar — sticky primary action + JSON toggle
 *   5. Compiled JSON preview (on demand)
 *
 * Monochrome: neutral zinc throughout; emphasis comes from weight and fill,
 * not hue.
 */

import { useState } from "react";
import { VisualBrain, ChallengeData } from "@/lib/authoring/types";
import { compileBrainToTexts } from "@/lib/authoring/brainCompiler";
import { BrainIntelligence } from "./BrainIntelligence";
import { ProblemBrief } from "./ProblemBrief";
import { StateEditor } from "./layers/StateEditor";
import { RuleBuilder } from "./layers/RuleBuilder";
import { FunctionComposer } from "./layers/FunctionComposer";
import { MemoryEditor } from "./layers/MemoryEditor";
import { ConditionEditor } from "./layers/ConditionEditor";
import { ControllerEditor } from "./layers/ControllerEditor";
import { ObjectivesPanel } from "./layers/ObjectivesPanel";
import { ObjectiveResult } from "@/lib/authoring/objectives";

type LayerTab =
  | "rules"
  | "conditions"
  | "states"
  | "goals"
  | "functions"
  | "memory"
  | "controller";

interface Props {
  challenge: ChallengeData;
  brain: VisualBrain;
  onBrainChange: (next: VisualBrain | ((prev: VisualBrain) => VisualBrain)) => void;
  onRun: () => void;
  runError: string | null;
  /** Objective results from the most recent run, or null before the first run. */
  objectiveResults: ObjectiveResult[] | null;
  /** How many runs have failed on this challenge — drives escalating hints. */
  attempts: number;
}

const TAB_LABELS: Record<LayerTab, string> = {
  rules: "Rules",
  conditions: "Conditions",
  states: "States",
  goals: "Objectives",
  functions: "Functions",
  memory: "Memory",
  controller: "Code",
};

export function AuthoringPanel({
  challenge,
  brain,
  onBrainChange,
  onRun,
  runError,
  objectiveResults,
  attempts,
}: Props) {
  const [activeTab, setActiveTab] = useState<LayerTab>("rules");
  const [showJson, setShowJson] = useState(false);
  const [showIntel, setShowIntel] = useState(false);

  const jsonTexts = showJson ? compileBrainToTexts(brain) : null;

  const tabBase = "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors";
  const tabActive = "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900";
  const tabIdle = "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800";

  // Every layer tab is always visible so the defaults (bricks, conditions,
  // states) are always discoverable. Composing is what unlocks per challenge,
  // not visibility — a locked Functions tab still lists the available bricks.
  const visibleTabs: LayerTab[] = [
    "rules",
    "conditions",
    "states",
    "goals",
    "functions",
    "memory",
    "controller",
  ];

  // Rules can select engine flags *and* any condition the user has named.
  // `derived` may be absent on brains persisted before the Conditions layer.
  const derived = brain.derived ?? [];
  const ruleConditions = [
    ...challenge.availableConditions,
    ...derived.filter((d) => d.id.trim()).map((d) => d.id),
  ];

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-col gap-4">
      {/* 1 — Problem brief (progressive disclosure: headline first, prose on demand) */}
      <ProblemBrief challenge={challenge} attempts={attempts} />

      {/* 2 — Layer editor (primary surface) */}
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap gap-1 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              className={`${tabBase} ${tab === activeTab ? tabActive : tabIdle}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="min-h-32">
          {activeTab === "rules" && (
            <RuleBuilder
              rules={brain.rules}
              folders={brain.ruleFolders ?? []}
              states={brain.states}
              functions={brain.functions}
              availableBricks={challenge.availableBricks}
              availableConditions={ruleConditions}
              onChange={(rulesOrFn) =>
                onBrainChange((prev) => ({
                  ...prev,
                  rules:
                    typeof rulesOrFn === "function"
                      ? rulesOrFn(prev.rules)
                      : rulesOrFn,
                }))
              }
              onFoldersChange={(ruleFolders) =>
                onBrainChange((prev) => ({ ...prev, ruleFolders }))
              }
            />
          )}
          {activeTab === "conditions" && (
            <ConditionEditor
              derived={derived}
              availableConditions={challenge.availableConditions}
              onChange={(d) => onBrainChange((prev) => ({ ...prev, derived: d }))}
            />
          )}
          {activeTab === "states" && (
            <StateEditor
              states={brain.states}
              initial={brain.initial}
              rules={brain.rules}
              editable={challenge.statesUnlocked ?? false}
              onStatesChange={(states) => onBrainChange({ ...brain, states })}
              onInitialChange={(initial) => onBrainChange({ ...brain, initial })}
            />
          )}
          {activeTab === "goals" && (
            <ObjectivesPanel
              objectives={challenge.objectives ?? []}
              results={objectiveResults}
            />
          )}
          {activeTab === "functions" && (
            <FunctionComposer
              functions={brain.functions}
              availableBricks={challenge.availableBricks}
              composable={challenge.functionsUnlocked}
              onChange={(functions) => onBrainChange({ ...brain, functions })}
            />
          )}
          {activeTab === "memory" && (
            <MemoryEditor
              memory={brain.memory}
              onChange={(memory) => onBrainChange({ ...brain, memory })}
            />
          )}
          {activeTab === "controller" && (
            <ControllerEditor
              code={brain.controllerCode ?? ""}
              onChange={(controllerCode) => onBrainChange((prev) => ({ ...prev, controllerCode }))}
            />
          )}
        </div>
      </div>

      {/* 3 — Current intelligence (collapsible, below the editor) */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <button
          onClick={() => setShowIntel((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left"
          aria-expanded={showIntel}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Current intelligence
          </span>
          <span className="text-xs text-zinc-400">{showIntel ? "Hide" : "Show"}</span>
        </button>
        {showIntel && (
          <div className="px-1 pb-1">
            <BrainIntelligence
              brain={brain}
              intelligenceExplanation={challenge.intelligenceExplanation}
            />
          </div>
        )}
      </div>

      {/* 4 — Run bar */}
      <div className="sticky bottom-0 rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-md backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 active:scale-[0.99] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Apply &amp; Run
          </button>
          <button
            onClick={() => setShowJson(!showJson)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            title="See the JSON your brain compiles to"
          >
            {showJson ? "Hide" : "Show"} JSON
          </button>
        </div>

        {runError && (
          <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-900 dark:text-zinc-100">
            <span className="font-semibold">Error · </span>
            {runError}
          </p>
        )}
      </div>

      {/* 5 — Compiled JSON preview */}
      {showJson && jsonTexts && (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500">
            Compiled brain JSON — exactly what the engine receives
          </p>
          {(["goals", "states", "rules", "functions", "memory"] as const).map((layer) => (
            <div key={layer}>
              <p className="mb-0.5 font-mono text-xs text-zinc-400">{layer}.json</p>
              <pre className="max-h-40 overflow-auto rounded bg-white p-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {jsonTexts[layer]}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
