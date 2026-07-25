"use client";

/**
 * The developer panel — exposes the engine's internal state each tick so you can
 * watch *why* the robot did what it did. This is the observability the milestone
 * calls for and the thing every later mode (competitions, interviews) reuses.
 */

import { SimStatus, SimStep } from "@/lib/engine/types";

const STATUS_LABEL: Record<SimStatus, string> = {
  idle: "Idle",
  running: "Running",
  reached: "✓ Completed",
  stuck: "✗ Stuck",
  "out-of-energy": "✗ Out of energy",
};

const STATUS_COLOR: Record<SimStatus, string> = {
  idle: "text-zinc-400",
  running: "text-zinc-500",
  reached: "text-zinc-900 dark:text-zinc-100",
  stuck: "text-zinc-900 dark:text-zinc-100",
  "out-of-energy": "text-zinc-900 dark:text-zinc-100",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-100 py-1.5 dark:border-zinc-800">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-right text-zinc-900 dark:text-zinc-100">
        {value}
      </span>
    </div>
  );
}

export function DebugPanel({ step }: { step: SimStep }) {
  const { observation: obs, trace } = step;
  const domainFacts = Object.entries(obs.domain);

  return (
    <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Debug panel
        </h2>
        <span className={`font-mono text-xs font-semibold ${STATUS_COLOR[step.status]}`}>
          {STATUS_LABEL[step.status]}
        </span>
      </div>

      <section className="mb-3">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Decision pipeline
        </h3>
        <Row label="Tick" value={step.tick} />
        <Row label="Active goal" value={trace.goalId ?? "—"} />
        <Row label="Active state" value={trace.stateId} />
        <Row label="Triggered rule" value={trace.ruleId ?? "—"} />
        <Row
          label="Executed function"
          value={
            trace.step
              ? `${trace.functionId ?? "—"} (${trace.step.index + 1}/${trace.step.total})`
              : trace.functionId ?? "—"
          }
        />
        <Row
          label="Returned action"
          value={
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {trace.action.type}
            </span>
          }
        />
      </section>

      <section className="mb-3">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Observation
        </h3>
        <Row label="Position" value={`(${obs.position.x}, ${obs.position.y})`} />
        <Row label="Direction" value={obs.direction} />
        <Row label="Wall ahead / L / R" value={`${obs.wallAhead ? "Y" : "n"} / ${obs.wallLeft ? "Y" : "n"} / ${obs.wallRight ? "Y" : "n"}`} />
        <Row label="Goal visible" value={obs.goalVisible ? `yes → ${obs.goalDirection}` : "no"} />
        <Row label="Visited tiles" value={obs.visitedCount} />
        <Row label="Energy" value={obs.energy ?? "∞"} />
        <Row
          label="Holding on goal"
          value={
            <span
              className={
                step.goalHold.current > 0
                  ? "font-semibold text-zinc-900 dark:text-zinc-100"
                  : undefined
              }
            >
              {step.goalHold.current} / {step.goalHold.required}
            </span>
          }
        />
      </section>

      {domainFacts.length > 0 && (
        <section className="mb-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Domain facts
          </h3>
          {domainFacts.map(([name, value]) => (
            <Row key={name} label={name} value={typeof value === "boolean" ? (value ? "yes" : "no") : value} />
          ))}
        </section>
      )}

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Memory
        </h3>
        <pre className="max-h-28 overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {JSON.stringify(step.memory, null, 2)}
        </pre>
      </section>
    </div>
  );
}
