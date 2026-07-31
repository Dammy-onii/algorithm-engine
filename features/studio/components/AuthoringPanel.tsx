"use client";

/**
 * AuthoringPanel — the visual policy layers plus an optional Code controller.
 *
 * Workspace hierarchy:
 *   1. Complete challenge statement.
 *   2. Three destinations: Policy, Code, Reference.
 *   3. Policy retains dedicated Rules, Conditions, Functions, and Advanced
 *      subviews so technical depth is progressively disclosed, never removed.
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
import { resolveWorldModule } from "@/lib/engine/worlds/registry";
import { findWorld } from "@/lib/content/datasets";
import { ObjectivesPanel } from "./layers/ObjectivesPanel";
import { ObjectiveResult } from "@/lib/authoring/objectives";

type PrimaryTab = "policy" | "controller" | "reference";
type PolicyTab =
  | "rules"
  | "conditions"
  | "functions"
  | "advanced";
type AdvancedTab = "states" | "memory";

interface Props {
  challenge: ChallengeData;
  brain: VisualBrain;
  onBrainChange: (next: VisualBrain | ((prev: VisualBrain) => VisualBrain)) => void;
  runError: string | null;
  /** Objective results from the most recent run, or null before the first run. */
  objectiveResults: ObjectiveResult[] | null;
  /** How many runs have failed on this challenge — drives escalating hints. */
  attempts: number;
  /** Id of the rule firing on the current tick, highlighted live during a run. */
  activeRuleId?: string | null;
}

const POLICY_TAB_LABELS: Record<PolicyTab, string> = {
  rules: "Rules",
  conditions: "Conditions",
  functions: "Functions",
  advanced: "Advanced",
};

export function AuthoringPanel({
  challenge,
  brain,
  onBrainChange,
  runError,
  objectiveResults,
  attempts,
  activeRuleId,
}: Props) {
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("policy");
  const [policyTab, setPolicyTab] = useState<PolicyTab>("rules");
  const [advancedTab, setAdvancedTab] = useState<AdvancedTab>("states");
  const [showJson, setShowJson] = useState(false);

  const jsonTexts = showJson ? compileBrainToTexts(brain) : null;

  const tabBase = "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors";
  const tabActive = "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900";
  const tabIdle = "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800";

  // Rules can select engine flags *and* any condition the user has named.
  // `derived` may be absent on brains persisted before the Conditions layer.
  const derived = brain.derived ?? [];
  const ruleConditions = [
    ...challenge.availableConditions,
    ...derived.filter((d) => d.id.trim()).map((d) => d.id),
  ];

  // The active world module, for the Code tab's observation/action reference.
  const worldKind = findWorld(challenge.worldKey).source.world.kind ?? "maze";
  const controllerWorld = resolveWorldModule(worldKind);
  const controllerMode = brain.controllerMode ?? "visual";

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-col gap-4">
      {/* 1 — Complete problem statement, followed by a scroll cue */}
      <ProblemBrief challenge={challenge} attempts={attempts} />

      {/* 2 — Layer editor (primary surface) */}
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Active controller
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Apply &amp; Run executes only the selected controller.
            </p>
          </div>
          <div
            className="inline-flex self-start rounded-lg border border-zinc-300 bg-white p-1 dark:border-zinc-600 dark:bg-zinc-900"
            role="group"
            aria-label="Active controller"
          >
            <ControllerModeButton
              active={controllerMode === "visual"}
              label="Visual policy"
              onClick={() => {
                setPrimaryTab("policy");
                onBrainChange((current) => ({
                  ...current,
                  controllerMode: "visual",
                }));
              }}
            />
            <ControllerModeButton
              active={controllerMode === "code"}
              label="Code controller"
              onClick={() => {
                setPrimaryTab("controller");
                onBrainChange((current) => ({
                  ...current,
                  controllerMode: "code",
                }));
              }}
            />
          </div>
        </div>

        <div
          className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800"
          role="tablist"
          aria-label="Authoring workspace"
        >
          <PrimaryTabButton
            active={primaryTab === "policy"}
            label="Policy"
            description="Build decisions"
            onClick={() => setPrimaryTab("policy")}
          />
          <PrimaryTabButton
            active={primaryTab === "controller"}
            label="Code"
            description="Write decide()"
            onClick={() => setPrimaryTab("controller")}
          />
          <PrimaryTabButton
            active={primaryTab === "reference"}
            label="Reference"
            description="Pass contract"
            onClick={() => setPrimaryTab("reference")}
          />
        </div>

        <div className="min-h-32">
          {primaryTab === "policy" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                {(["rules", "conditions", "functions", "advanced"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      className={`${tabBase} ${tab === policyTab ? tabActive : tabIdle}`}
                      onClick={() => setPolicyTab(tab)}
                    >
                      {POLICY_TAB_LABELS[tab]}
                    </button>
                  ),
                )}
              </div>

              {policyTab === "rules" && (
                <RuleBuilder
                  rules={brain.rules}
                  folders={brain.ruleFolders ?? []}
                  states={brain.states}
                  functions={brain.functions}
                  availableBricks={challenge.availableBricks}
                  availableConditions={ruleConditions}
                  activeRuleId={activeRuleId}
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
              {policyTab === "conditions" && (
                <ConditionEditor
                  derived={derived}
                  availableConditions={challenge.availableConditions}
                  onChange={(d) =>
                    onBrainChange((prev) => ({ ...prev, derived: d }))
                  }
                />
              )}
              {policyTab === "functions" && (
                <FunctionComposer
                  functions={brain.functions}
                  availableBricks={challenge.availableBricks}
                  composable={challenge.functionsUnlocked}
                  onChange={(functions) =>
                    onBrainChange({ ...brain, functions })
                  }
                />
              )}
              {policyTab === "advanced" && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                    States and memory support policies that must remember an
                    operating mode or values across ticks. Most early problems
                    can be solved without them.
                  </div>
                  <div className="inline-flex self-start rounded-md border border-zinc-200 p-1 dark:border-zinc-700">
                    {(["states", "memory"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setAdvancedTab(tab)}
                        className={`${tabBase} ${advancedTab === tab ? tabActive : tabIdle}`}
                      >
                        {tab === "states" ? "Operating states" : "Memory"}
                      </button>
                    ))}
                  </div>
                  {advancedTab === "states" ? (
                    <StateEditor
                      states={brain.states}
                      initial={brain.initial}
                      rules={brain.rules}
                      editable={challenge.statesUnlocked ?? false}
                      domain={challenge.pack}
                      onStatesChange={(states) =>
                        onBrainChange({ ...brain, states })
                      }
                      onInitialChange={(initial) =>
                        onBrainChange({ ...brain, initial })
                      }
                    />
                  ) : (
                    <MemoryEditor
                      memory={brain.memory}
                      onChange={(memory) => onBrainChange({ ...brain, memory })}
                    />
                  )}
                </div>
              )}
            </div>
          )}
          {primaryTab === "controller" && (
            <ControllerEditor
              code={brain.controllerCode ?? ""}
              domain={worldKind}
              gridWorld={controllerWorld.tracksMovement !== false}
              observableDomain={controllerWorld.domainFlags
                .filter((flag) => flag.id !== worldKind)
                .map((flag) => ({
                  id: flag.id,
                  label: flag.label,
                  meaning: flag.meaning,
                  type: flag.type,
                }))}
              availableActions={Array.from(
                new Set(
                  brain.functions
                    .filter(
                      (fn) =>
                        fn.action &&
                        (challenge.availableBricks.length === 0 ||
                          challenge.availableBricks.includes(fn.id)),
                    )
                    .map((fn) => fn.action!),
                ),
              )}
              onChange={(controllerCode) => onBrainChange((prev) => ({ ...prev, controllerCode }))}
            />
          )}
          {primaryTab === "reference" && (
            <div className="flex flex-col gap-3">
              <ObjectivesPanel
                objectives={challenge.objectives ?? []}
                results={objectiveResults}
              />
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Current policy summary
                </p>
                <div className="mt-1">
            <BrainIntelligence
              brain={brain}
              intelligenceExplanation={challenge.intelligenceExplanation}
            />
                </div>
              </div>
              <details className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200"
                  onClick={() => setShowJson(true)}
                >
                  <span>Compiled policy JSON</span>
                  <span className="text-zinc-400 transition-transform group-open:rotate-180">
                    ⌄
                  </span>
                </summary>
                {showJson && jsonTexts && (
                  <div className="flex flex-col gap-2 border-t border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="text-xs text-zinc-500">
                      Exact six-layer data sent to the engine.
                    </p>
                    {(["goals", "states", "rules", "functions", "conditions", "memory"] as const).map((layer) => (
                      <div key={layer}>
                        <p className="mb-0.5 font-mono text-xs text-zinc-400">{layer}.json</p>
                        <pre className="max-h-40 overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {jsonTexts[layer]}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            </div>
          )}
          {runError && (
            <p className="mt-3 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
              <span className="font-semibold">Could not run · </span>
              {runError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PrimaryTabButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "rounded-md px-3 py-2 text-left transition-colors",
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
          : "text-zinc-500 hover:bg-white/70 dark:text-zinc-400 dark:hover:bg-zinc-900/60",
      ].join(" ")}
    >
      <span className="block text-xs font-semibold">{label}</span>
      <span className="mt-0.5 hidden text-[9px] opacity-70 sm:block">
        {description}
      </span>
    </button>
  );
}

function ControllerModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
