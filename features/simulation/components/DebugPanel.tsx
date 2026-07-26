"use client";

/**
 * Shared engine observability for every world.
 *
 * The current decision remains immediately visible. Larger supporting payloads
 * are grouped into native, keyboard-accessible accordions, and the complete
 * panel can be collapsed when the simulation needs more room.
 */

import type { DomainFlagSpec } from "@/lib/engine/worlds/module";
import type { SimStatus, SimStep } from "@/lib/engine/types";
import { useState } from "react";

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

const TWO_DECIMALS = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NAIRA = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatDebugNumber(
  value: number,
  format: DomainFlagSpec["format"] = "decimal",
): string {
  if (!Number.isFinite(value)) return String(value);
  if (format === "percentFraction") {
    return `${TWO_DECIMALS.format(value * 100)}%`;
  }
  if (format === "percent") {
    return `${TWO_DECIMALS.format(value)}%`;
  }
  if (format === "currency") {
    return NAIRA.format(value);
  }
  return TWO_DECIMALS.format(value);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-1.5 last:border-b-0 dark:border-zinc-800">
      <span className="min-w-0 text-zinc-500">{label}</span>
      <span className="min-w-0 break-words font-mono text-right text-zinc-900 dark:text-zinc-100">
        {value}
      </span>
    </div>
  );
}

function Accordion({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-t border-zinc-200 dark:border-zinc-800">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 marker:content-none">
        <span>
          {title}
          {count !== undefined && (
            <span className="ml-2 font-mono text-[10px] text-zinc-400">
              {count}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="text-base text-zinc-400 transition-transform group-open:rotate-180"
        >
         ⌄
        </span>
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

function memoryValue(value: unknown): string {
  if (typeof value === "number") return formatDebugNumber(value);
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function DebugPanel({
  step,
  domainFlags = [],
}: {
  step: SimStep;
  domainFlags?: readonly DomainFlagSpec[];
}) {
  const [panelOpen, setPanelOpen] = useState(true);
  const { observation: obs, trace } = step;
  const specs = new Map(domainFlags.map((flag) => [flag.id, flag]));
  const domainFacts = Object.entries(obs.domain);
  const memoryFacts = Object.entries(step.memory);

  return (
    <details
      open={panelOpen}
      onToggle={(event) => setPanelOpen(event.currentTarget.open)}
      className="group/debug w-full rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Debug panel
          </span>
          <span className="text-zinc-400 transition-transform group-open/debug:rotate-180">
            ⌄
          </span>
        </span>
        <span
          className={`font-mono text-xs font-semibold ${STATUS_COLOR[step.status]}`}
        >
          {STATUS_LABEL[step.status]}
        </span>
      </summary>

      <div className="border-t border-zinc-200 px-4 dark:border-zinc-800">
        <section className="py-3">
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

        <Accordion title="World observation">
          <Row
            label="Position"
            value={`(${obs.position.x}, ${obs.position.y})`}
          />
          <Row label="Direction" value={obs.direction} />
          <Row
            label="Wall ahead / left / right"
            value={`${obs.wallAhead ? "yes" : "no"} / ${obs.wallLeft ? "yes" : "no"} / ${obs.wallRight ? "yes" : "no"}`}
          />
          <Row
            label="Goal visible"
            value={obs.goalVisible ? `yes → ${obs.goalDirection}` : "no"}
          />
          <Row label="Visited tiles" value={obs.visitedCount} />
          <Row label="Energy" value={obs.energy ?? "∞"} />
          <Row
            label="Holding on goal"
            value={`${step.goalHold.current} / ${step.goalHold.required}`}
          />
        </Accordion>

        {domainFacts.length > 0 && (
          <Accordion title="Domain facts" count={domainFacts.length}>
            {domainFacts.map(([name, value]) => {
              const spec = specs.get(name);
              return (
                <Row
                  key={name}
                  label={spec?.label ?? name}
                  value={
                    typeof value === "boolean"
                      ? value
                        ? "yes"
                        : "no"
                      : formatDebugNumber(value, spec?.format)
                  }
                />
              );
            })}
          </Accordion>
        )}

        <Accordion title="Memory" count={memoryFacts.length}>
          {memoryFacts.length > 0 ? (
            memoryFacts.map(([name, value]) => (
              <Row key={name} label={name} value={memoryValue(value)} />
            ))
          ) : (
            <p className="rounded-md bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-500 dark:bg-zinc-800">
              {"{}"}
            </p>
          )}
        </Accordion>
      </div>
    </details>
  );
}
