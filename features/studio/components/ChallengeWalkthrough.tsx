"use client";

import { useEffect, useState } from "react";

interface Props {
  challengeName: string;
  packId: string;
  includesSubmission: boolean;
  onFinish: () => void;
}

interface WalkthroughStep {
  shortLabel: string;
  eyebrow: string;
  title: string;
  summary: string;
  location: string;
  details: string[];
  example?: {
    label: string;
    value: string;
  };
  note?: string;
}

interface WorldLanguage {
  controller: string;
  environment: string;
  facts: string;
  actions: string;
  ruleExample: string;
}

/**
 * Detailed first-run orientation for the shared challenge workspace.
 *
 * It teaches the stable product workflow and adapts its terminology to the
 * selected world without revealing a challenge solution.
 */
export function ChallengeWalkthrough({
  challengeName,
  packId,
  includesSubmission,
  onFinish,
}: Props) {
  const [index, setIndex] = useState(0);
  const language = worldLanguage(packId);
  const steps = walkthroughSteps(language, includesSubmission);
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFinish();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/65 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-walkthrough-title"
        aria-describedby="challenge-walkthrough-summary"
        className="flex max-h-[min(92dvh,54rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-[#181818]"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                Challenge workspace guide
              </p>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {index + 1} of {steps.length}
              </span>
            </div>
            <h2
              id="challenge-walkthrough-title"
              className="mt-1 truncate text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100"
            >
              {challengeName}
            </h2>
            <p
              id="challenge-walkthrough-summary"
              className="mt-1 text-xs text-zinc-500"
            >
              Learn the complete solve → run → inspect workflow. This guide
              explains the interface, not the answer.
            </p>
          </div>
          <button
            type="button"
            onClick={onFinish}
            aria-label="Close challenge walkthrough"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
          <nav
            aria-label="Walkthrough steps"
            className="shrink-0 overflow-x-auto border-b border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 md:overflow-y-auto md:border-r md:border-b-0 md:p-4"
          >
            <ol className="flex min-w-max gap-2 md:min-w-0 md:flex-col">
              {steps.map((item, stepIndex) => {
                const active = stepIndex === index;
                const visited = stepIndex < index;
                return (
                  <li key={item.shortLabel}>
                    <button
                      type="button"
                      onClick={() => setIndex(stepIndex)}
                      aria-current={active ? "step" : undefined}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                        active
                          ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                          : "text-zinc-600 hover:bg-white hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                          active
                            ? "border-white/30 bg-white/10 dark:border-zinc-900/20 dark:bg-zinc-900/10"
                            : visited
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-zinc-300 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900",
                        ].join(" ")}
                      >
                        {visited ? "✓" : stepIndex + 1}
                      </span>
                      <span className="whitespace-nowrap text-xs font-semibold md:whitespace-normal">
                        {item.shortLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-5 hidden rounded-xl border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 md:block">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                Need this again?
              </p>
              <p className="mt-1">
                Open <strong>Guide</strong> from the challenge header at any
                time. Closing this window never changes your solution.
              </p>
            </div>
          </nav>

          <main className="min-h-0 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
            <div className="mx-auto max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                {step.eyebrow}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-3xl">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {step.summary}
              </p>

              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Where to look
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {step.location}
                </p>
              </div>

              <ul className="mt-6 grid gap-3">
                {step.details.map((detail, detailIndex) => (
                  <li
                    key={detail}
                    className="flex gap-3 rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-800"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                      {detailIndex + 1}
                    </span>
                    <p className="text-sm leading-5 text-zinc-600 dark:text-zinc-300">
                      {detail}
                    </p>
                  </li>
                ))}
              </ul>

              {step.example && (
                <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100">
                  <p className="border-b border-zinc-800 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {step.example.label}
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-3 font-mono text-xs leading-5 text-emerald-300">
                    {step.example.value}
                  </pre>
                </div>
              )}

              {step.note && (
                <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <span aria-hidden="true" className="font-bold">
                    !
                  </span>
                  <p className="text-xs leading-5">{step.note}</p>
                </div>
              )}
            </div>
          </main>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
          <button
            type="button"
            onClick={onFinish}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            Skip guide
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={index === 0}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() =>
                last ? onFinish() : setIndex((current) => current + 1)
              }
              className="min-w-28 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {last ? "Start challenge" : "Continue"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function walkthroughSteps(
  language: WorldLanguage,
  includesSubmission: boolean,
): WalkthroughStep[] {
  const steps: WalkthroughStep[] = [
    {
      shortLabel: "Workspace map",
      eyebrow: "Orientation",
      title: "Know what each part of the workspace owns",
      summary: `The challenge page is split between authoring the ${language.controller} and observing the ${language.environment}. Both panels scroll independently, so your logic and the live system remain visible side by side.`,
      location: "Whole page · Header, authoring panel, and simulation panel",
      details: [
        "The header owns problem navigation, Apply & Run, interview submission where available, the Guide, and appearance controls.",
        "The left panel owns the problem statement and every editable intelligence layer. Changes are saved automatically for this challenge.",
        "The right panel owns the visible environment, controls, task progress, results, and the collapsible decision/debug pipeline.",
      ],
      note: "The two panels are intentionally independent. Scrolling the problem or editor should not move the simulation panel.",
    },
    {
      shortLabel: "Read the task",
      eyebrow: "Understand",
      title: "Turn the write-up into an operational contract",
      summary:
        "Before adding rules, identify the required outcome, the hard constraints that must never be violated, and the quality metrics that distinguish a robust solution from one that merely terminates.",
      location: "Left panel · Description & intelligence",
      details: [
        "The brief states the immediate task. Expand Learn more for the scenario, context, and what the supplied scaffold already does.",
        "The task checklist translates the statement into observable milestones. Informational items guide design; checked items update from the live run.",
        "Hints reveal progressively stronger guidance. They explain the interface and decision dimensions without changing your policy.",
      ],
      example: {
        label: "Questions to answer before coding",
        value:
          "What must finish?\nWhat can fail or become unavailable?\nWhich facts change each tick?\nWhich outcomes are penalized?",
      },
    },
    {
      shortLabel: "Build intelligence",
      eyebrow: "Author",
      title: "Choose the right layer for each idea",
      summary: `The platform separates what the ${language.controller} observes, how it organizes behaviour, and which action it returns. Use the smallest set of layers that expresses your algorithm clearly.`,
      location: "Left panel · Rules, Conditions, States, Functions, Memory, Code",
      details: [
        "Rules are the ordered decision flow: WHEN a condition is true, DO one function. Dragging a rule changes execution order; folders only organize cards.",
        "Conditions name reusable boolean expressions. States represent persistent operating modes. Functions package reusable action sequences. Memory stores controller-owned values.",
        "Code mode is an alternative local controller for Apply & Run. A non-empty Code controller replaces visual rule selection; visual rules and code do not currently synchronize.",
      ],
      example: {
        label: "World vocabulary",
        value: `Facts: ${language.facts}\nActions: ${language.actions}`,
      },
      note: "Do not create a rule merely because a fact exists. Every branch should represent a deliberate decision or fallback.",
    },
    {
      shortLabel: "Decision flow",
      eyebrow: "Execute",
      title: "Understand exactly what happens on one tick",
      summary:
        "The engine does not execute every matching action. It observes the current world, evaluates the ordered policy, validates the candidate action, and commits one decision before the world advances.",
      location: "Rules tab and right panel · Decision pipeline",
      details: [
        "The world publishes a fresh observation. Conditions read only those current facts plus state and memory.",
        "Rules are checked from top to bottom. The first matching rule whose next action is valid wins; broader fallbacks belong below specific cases.",
        "The action updates the world, time advances, dynamic events occur, objectives are re-evaluated, and the next tick begins with a new observation.",
      ],
      example: {
        label: "Illustrative rule shape — not a challenge answer",
        value: language.ruleExample,
      },
    },
    {
      shortLabel: "Run and control",
      eyebrow: "Test visibly",
      title: "Use Apply & Run as your development loop",
      summary:
        "Apply & Run compiles the current intelligence and starts a fresh copy of the visible scenario. Use the controls to inspect timing-sensitive behaviour instead of waiting for the final animation.",
      location: "Header or left-panel footer · Apply & Run; right-panel controls",
      details: [
        "Pause and Step isolate one decision. Compare the observation and returned action before advancing again.",
        "Speed changes presentation time, not simulation semantics. Reset creates a clean run while preserving your authored solution.",
        "Visible objectives are evaluated when the run terminates. A queue becoming empty or an animation stopping does not automatically mean the challenge passed.",
      ],
      note: "Always inspect failed objectives. A policy can terminate after timeouts, invalid allocations, or other losses and still be an unsuccessful solution.",
    },
    {
      shortLabel: "Debug and improve",
      eyebrow: "Diagnose",
      title: "Trace why the policy made its decision",
      summary:
        "Use the debug pipeline to connect the environment to the policy. It should answer: what was observed, which branch won, what action was returned, and how the world changed.",
      location: "Right panel · Debug pipeline, task progress, and results",
      details: [
        "The main decision pipeline remains visible. Expand Observation, Domain metrics, Memory, and other accordions only when you need their detail.",
        "Compare changing values over several ticks—provider capacity, walls, queues, battery, bays, state, or memory—rather than judging one static frame.",
        "Results separate required objectives from bonuses. Revise the policy, rerun the same visible case, and verify the correction did not break an earlier branch.",
      ],
      example: {
        label: "Debugging question sequence",
        value:
          "Observed facts → matched rule → executed function → returned action\n                         ↓\n              expected world update?",
      },
    },
  ];

  if (includesSubmission) {
    steps.push({
      shortLabel: "Submit interview",
      eyebrow: "Evaluate",
      title: "Keep practice and final evaluation separate",
      summary:
        "Apply & Run uses the visible scenario for iteration. Submit sends the unchanged visual policy to protected server-side scenarios designed to expose hardcoding and weak fallbacks.",
      location: "Header or interview results panel · Submit",
      details: [
        "Hidden cases do not run while you edit or use Apply & Run. They begin only after an explicit Submit.",
        "Each hidden scenario reports progress and contributes to the final interview score without revealing protected fixture data beforehand.",
        "Code-mode JavaScript remains local Apply & Run only until an isolated multi-language execution worker is added; current hidden submission evaluates the visual policy DSL.",
      ],
      note: "A policy that memorizes the visible provider, route, layout, or event timing should be expected to fail hidden evaluation.",
    });
  }

  return steps;
}

function worldLanguage(packId: string): WorldLanguage {
  if (packId === "maze") {
    return {
      controller: "maze robot",
      environment: "maze",
      facts: "wallAhead, wallLeft, wallRight, atGoal",
      actions: "step, pivot-left, pivot-right, hold",
      ruleExample: "WHEN <a sensed route condition>\nDO <one navigation function>",
    };
  }
  if (packId === "warehouse") {
    return {
      controller: "warehouse worker",
      environment: "warehouse operation",
      facts: "packageHere, carryingPackage, deliveryHere, energy",
      actions: "move, pick up, deliver, charge, hold",
      ruleExample: "WHEN <an operational condition>\nDO <one warehouse function>",
    };
  }
  if (packId === "finance") {
    return {
      controller: "payment router",
      environment: "payment switch",
      facts: "transaction facts, provider health, capacity, latency, deadlines",
      actions: "routeToA/B/C, hold, decline",
      ruleExample: "WHEN <eligibility and service condition>\nDO <one routing function>",
    };
  }
  if (packId === "parking") {
    return {
      controller: "parking controller",
      environment: "parking facility",
      facts: "vehicle needs, queue pressure, bay and gate availability",
      actions: "allocate, release, hold, reject",
      ruleExample: "WHEN <vehicle and facility condition>\nDO <one parking function>",
    };
  }
  return {
    controller: "autonomous agent",
    environment: "simulation",
    facts: "the current world observation",
    actions: "the functions published by this world",
    ruleExample: "WHEN <current condition>\nDO <one available function>",
  };
}
