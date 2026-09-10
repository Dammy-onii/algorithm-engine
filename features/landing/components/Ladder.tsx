"use client";

import { useState } from "react";
import { Eyebrow, Reveal, Section } from "./primitives";

type Mode = "blocks" | "pseudocode" | "code";

const MODES: { id: Mode; label: string; note: string }[] = [
  { id: "blocks", label: "Blocks", note: "Focus on reasoning without testing syntax." },
  { id: "pseudocode", label: "Plain steps", note: "Explain the same solution in everyday language." },
  { id: "code", label: "Code", note: "Implement the same solution in TypeScript." },
];

export function Ladder() {
  const [mode, setMode] = useState<Mode>("blocks");

  return (
    <Section className="blueprint">
      <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal>
          <Eyebrow>Flexible assessment format</Eyebrow>
          <h2 className="mt-5 text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
            Test the skill you need.
            <br />
            <span className="text-ink-40">Not just code recall.</span>
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-60">
            Match the assessment to the role. Candidates can arrange visual blocks, describe
            their approach in plain steps, or write real code. Every format controls the same
            scenario, so you can focus on the choices and skills that matter for the job.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-full px-4 py-2 font-mono text-xs transition ${
                  mode === m.id
                    ? "bg-ink text-white"
                    : "border border-line text-ink-60 hover:border-ink/30 hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-4 font-mono text-[11px] text-ink-40">
            {MODES.find((m) => m.id === mode)!.note}
          </p>
        </Reveal>

        <Reveal delay={90}>
          <div className="overflow-hidden rounded-card border border-line bg-white shadow-[0_12px_40px_-28px_rgba(10,10,11,0.5)]">
            <div className="border-b border-line-soft px-4 py-2.5 font-mono text-[11px] text-ink-40">
              policy · avoid-dead-ends
            </div>
            <div className="p-5 text-[13px] sm:p-6">
              {mode === "blocks" && <Blocks />}
              {mode === "pseudocode" && <Pseudocode />}
              {mode === "code" && <Code />}
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function Blocks() {
  return (
    <div className="space-y-2.5 font-mono text-xs">
      <div className="rounded-lg bg-signal/8 px-3 py-2.5 text-signal">
        DEFINE <span className="text-ink">deadEnd</span> = wallAhead && wallLeft && wallRight
      </div>
      <div className="ml-0 rounded-lg border border-line px-3 py-2.5">
        <span className="text-ink-40">WHEN</span> deadEnd
      </div>
      <div className="ml-6 rounded-lg bg-ink px-3 py-2.5 text-white">
        <span className="text-white/50">DO</span> aboutFace
        <span className="ml-2 text-white/40">· 2 steps</span>
      </div>
      <div className="rounded-lg border border-line px-3 py-2.5">
        <span className="text-ink-40">WHEN</span> goalVisible
      </div>
      <div className="ml-6 rounded-lg bg-ink px-3 py-2.5 text-white">
        <span className="text-white/50">DO</span> moveToward(goal)
      </div>
    </div>
  );
}

function Pseudocode() {
  return (
    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-60">
      {`a dead end is when there is a wall ahead,
  a wall to the left, and a wall to the right.

while not at the goal:
  if it is a dead end   -> turn around
  if the goal is visible -> move toward the goal
  otherwise              -> keep exploring`}
    </pre>
  );
}

function Code() {
  return (
    <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-ink-60">
      {`const deadEnd = (o: Observation) =>
  o.wallAhead && o.wallLeft && o.wallRight;

export function decide(o: Observation): Action {
  if (deadEnd(o)) return aboutFace();
  if (o.goalVisible) return moveToward(o.goal);
  return explore(o);
}`}
    </pre>
  );
}
