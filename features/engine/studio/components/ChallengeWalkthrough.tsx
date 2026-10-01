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
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onFinish();
      }}
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
      title: "Know what each part of the page does",
      summary: `The page has two panels side by side. On the left, you read the problem and build the rules for the ${language.controller}. On the right, you watch the ${language.environment} run.`,
      location: "Whole page · Header, left panel, and right panel",
      details: [
        `The header has the problem list, the previous and next arrows, Apply & Run, Lab, Guide, and the light/dark switch.${includesSubmission ? " Interview problems also have Submit solution." : ""}`,
        "The left panel shows the problem statement and the rule editor. Your work is saved automatically for each challenge.",
        `The right panel shows the live ${language.environment}, the play controls, task progress, results, and the debug panel.`,
        "On a small screen, the two panels become Build and Run tabs.",
      ],
      note: "Each panel scrolls on its own, so you can read your rules while the simulation keeps running.",
    },
    {
      shortLabel: "Read the task",
      eyebrow: "Understand",
      title: "Know what you need to achieve",
      summary:
        "Start by reading the problem. Find out what must happen, what must never happen, and how your result will be judged.",
      location: "Left panel · Problem statement; right panel · Task progress",
      details: [
        "The bold line at the top is the task in one sentence. The scenario and problem statement below it explain the situation.",
        "What this teaches tells you the idea this challenge is about.",
        "Task progress & pass contract, on the right, lists the milestones. Each one ticks off while the simulation runs.",
        "Show a hint reveals one hint at a time. The first hints only nudge you. The last hint may give the answer, so try on your own first.",
      ],
      example: {
        label: "Questions to answer first",
        value:
          "What must be finished?\nWhat can go wrong?\nWhich facts change on each step?\nWhat counts as a mistake?",
      },
    },
    {
      shortLabel: "Build your rules",
      eyebrow: "Author",
      title: "Write the rules that make each decision",
      summary: `You control the ${language.controller} with rules. Each rule says: WHEN something is true, DO an action.`,
      location: "Left panel · Policy, Code, and Reference",
      details: [
        "Policy → Rules is where you add, edit, and reorder your rules.",
        "Policy → Conditions lists every fact you can check. You can also save a named check to reuse.",
        "Policy → Functions lists every action you can use. On later challenges, you can join actions into multi-step functions.",
        "Policy → Advanced holds states (modes, such as searching or returning) and memory, for problems that need them.",
        "Code lets you write a decide() function instead of rules. Reference shows the pass contract and a summary of your policy.",
        "The Active controller switch chooses what Apply & Run uses: your rules (Visual policy) or your code (Code controller).",
      ],
      example: {
        label: "What this world gives you",
        value: `Facts: ${language.facts}\nActions: ${language.actions}`,
      },
      note: "Only add a rule when it makes a real decision. Every rule should have a clear reason to be there.",
    },
    {
      shortLabel: "How a step works",
      eyebrow: "Execute",
      title: "Understand exactly what happens on one step",
      summary: `The simulation runs one step (a tick) at a time. On each step, the ${language.controller} makes exactly one decision.`,
      location: "Policy → Rules; right panel · Debug panel",
      details: [
        "The world gives fresh facts about what is happening right now.",
        "Rules are checked from top to bottom. The first rule whose WHEN is true, and whose action is possible right now, wins. The rules below it are skipped.",
        `If no rule wins, the ${language.controller} waits for that step.`,
        "The chosen action runs, the world moves forward one step, and the next step starts with fresh facts.",
        "A multi-step function carries on with its next steps before the rules are checked again. It stops early if its next step is no longer possible.",
      ],
      example: {
        label: "The shape of a rule — not a challenge answer",
        value: language.ruleExample,
      },
      note: "Put specific rules near the top and catch-all rules (such as WHEN always) at the bottom. A catch-all at the top wins every time.",
    },
    {
      shortLabel: "Run and control",
      eyebrow: "Test",
      title: "Use Apply & Run to test your rules",
      summary:
        "Apply & Run saves your rules, checks them for errors, and starts a fresh run of the scenario you can see.",
      location: "Header · Apply & Run; right panel · Controls",
      details: [
        "Start and Pause play or stop the run. Step moves forward exactly one step, so you can study a single decision.",
        "Speed only changes how fast the run plays. It never changes the result.",
        "Reset starts the scenario again from the beginning. Your rules are kept.",
        "When the run ends, the results show which required goals and bonus goals you met. When every required goal is met, the challenge is complete and a pop-up shows what you learned.",
      ],
      note: "A run that stops is not always a pass. Always check the results for goals you missed.",
    },
    {
      shortLabel: "Debug and improve",
      eyebrow: "Diagnose",
      title: "Find out why a decision was made",
      summary: `The debug panel shows why the ${language.controller} did what it did on each step.`,
      location: "Right panel · Debug panel and Task progress",
      details: [
        "Decision pipeline shows the step number, the active goal and state, the rule that won, the function that ran, and the action it returned.",
        "Why this action? shows the WHEN condition of the winning rule.",
        "Domain facts shows every fact the world gave on that step. Memory shows anything your policy stored. Grid worlds also show World observation.",
        "Pause and Step through a few steps and watch how the facts change. Then fix your rules, run again, and check that you did not break something that worked before.",
      ],
      example: {
        label: "Questions to ask on a wrong step",
        value:
          "Which facts were true?\n→ Which rule won?\n→ Which action ran?\n→ Did the world change the way you expected?",
      },
    },
  ];

  if (includesSubmission) {
    steps.push({
      shortLabel: "Submit solution",
      eyebrow: "Evaluate",
      title: "Keep practice and final evaluation separate",
      summary:
        "Apply & Run uses the visible scenario for iteration. Submit solution evaluates whichever controller is active against scenarios designed to expose hardcoding and weak fallbacks.",
      location: "Header or interview results panel · Submit solution",
      details: [
        "Interview cases do not run while you edit or use Apply & Run. They begin only after an explicit submission.",
        "Visual Policy is server evaluated. Code Controller uses the current Demo-mode browser worker and is clearly labelled browser evaluated.",
        "Each scenario reports progress, guardrails, and its contribution to the final score. Demo Code scenarios can be inspected after the browser receives them.",
      ],
      note: "A solution that memorizes the visible provider, route, layout, or event timing should be expected to fail the wider evaluation.",
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
      facts: "vehicle needs, queue pressure, space and gate availability",
      actions: "park in a matching space, release a departing vehicle, wait",
      ruleExample: "WHEN <vehicle and facility condition>\nDO <one parking function>",
    };
  }
  if (packId === "drone") {
    return {
      controller: "drone",
      environment: "search area",
      facts: "target detected, at target, search and target directions, battery, on pad",
      actions: "fly toward unsearched ground, fly toward the target, report, recharge, move north/east/south/west",
      ruleExample: "WHEN <what the drone senses>\nDO <one flight function>",
    };
  }
  if (packId === "decisions") {
    return {
      controller: "sorting desk",
      environment: "sorting desk",
      facts: "facts about the item at the sorting point, listed in the Conditions tab",
      actions: "send the item to one block or the other",
      ruleExample: "WHEN <a fact about the item>\nDO <send it to a block>",
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
