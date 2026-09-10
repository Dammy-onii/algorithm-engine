"use client";

import { useMemo, useState } from "react";

export interface ControllerFactReference {
  id: string;
  label: string;
  meaning: string;
  type: "bool" | "number";
}

interface FactRow {
  id: string;
  label: string;
  meaning: string;
  type: "bool" | "number" | "string" | "object";
  path: string;
}

const TRANSACTION_PREFIXES = [
  "amount",
  "priority",
  "transaction",
  "deadline",
  "processing",
  "retry",
  "lastProvider",
  "isHigh",
  "isUrgent",
];
const QUEUE_PREFIXES = [
  "queue",
  "waiting",
  "allProcessed",
  "succeeded",
  "failed",
  "timedOut",
  "overload",
  "score",
  "totalCost",
];
const VEHICLE_PREFIXES = [
  "car",
  "vehicle",
  "entrance",
  "exitRequest",
  "waitingTo",
];
const FACILITY_PREFIXES = [
  "space",
  "lane",
  "gate",
  "parking",
  "available",
  "occupied",
  "congestion",
];

function startsWithAny(value: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

export function controllerFactGroup(id: string): string {
  if (/[ABC]$/.test(id)) return `Provider ${id.at(-1)}`;
  if (startsWithAny(id, TRANSACTION_PREFIXES)) return "Current transaction";
  if (startsWithAny(id, QUEUE_PREFIXES)) return "Queue and outcomes";
  if (startsWithAny(id, VEHICLE_PREFIXES)) return "Current vehicle";
  if (startsWithAny(id, FACILITY_PREFIXES)) return "Facility";
  return "World state";
}

function ReferenceGroup({
  title,
  rows,
  defaultOpen = false,
  forceOpen = false,
}: {
  title: string;
  rows: FactRow[];
  defaultOpen?: boolean;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={forceOpen || open}
      onToggle={(event) => {
        if (!forceOpen) setOpen(event.currentTarget.open);
      }}
      className="group rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
        <span>
          {title}
          <span className="ml-2 font-mono text-[9px] text-zinc-400">
            {rows.length}
          </span>
        </span>
        <span className="text-zinc-400 transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="border-t border-zinc-100 dark:border-zinc-800">
        {rows.map((row) => (
          <div
            key={row.path}
            className="grid gap-0.5 border-b border-zinc-100 px-3 py-2 last:border-b-0 dark:border-zinc-800 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <code className="block break-all text-[10px] font-semibold text-zinc-800 dark:text-zinc-200">
                {row.path}
              </code>
              <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">
                {row.meaning || row.label}
              </p>
            </div>
            <span className="self-start font-mono text-[9px] text-zinc-400">
              {row.type}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

interface Props {
  baseFields: string[];
  domainFacts: ControllerFactReference[];
  actions: string[];
}

/** Searchable, grouped reference for Code mode inputs and outputs. */
export function ControllerReference({
  baseFields,
  domainFacts,
  actions,
}: Props) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase();
  const matches = (value: string) =>
    !normalized || value.toLocaleLowerCase().includes(normalized);

  const baseRows: FactRow[] = baseFields
    .filter((id) => matches(id))
    .map((id) => ({
      id,
      label: id,
      meaning: "Shared observation value supplied by the simulation engine.",
      type:
        id === "tick" || id === "visitedCount" || id === "energy"
          ? "number"
          : id === "position"
            ? "object"
            : id === "direction"
              ? "string"
              : "bool",
      path: `observation.${id}`,
    }));

  const grouped = useMemo(() => {
    const groups = new Map<string, FactRow[]>();
    for (const fact of domainFacts) {
      if (!matches(`${fact.id} ${fact.label} ${fact.meaning}`)) continue;
      const group = controllerFactGroup(fact.id);
      const rows = groups.get(group) ?? [];
      rows.push({ ...fact, path: `observation.domain.${fact.id}` });
      groups.set(group, rows);
    }
    return [...groups.entries()];
    // `matches` intentionally follows the current normalized query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainFacts, normalized]);

  const visibleActions = actions.filter((action) => matches(action));
  const factCount =
    baseRows.length +
    grouped.reduce((total, [, rows]) => total + rows.length, 0);

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Inputs and outputs reference
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            Search instead of scrolling through every fact in the world.
          </p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search facts or actions…"
          aria-label="Search code reference"
          className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 sm:w-64"
        />
      </div>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1">
        {baseRows.length > 0 && (
          <ReferenceGroup
            title="Shared observation"
            rows={baseRows}
            defaultOpen
            forceOpen={Boolean(normalized)}
          />
        )}
        {grouped.map(([group, rows]) => (
          <ReferenceGroup
            key={group}
            title={group}
            rows={rows}
            forceOpen={Boolean(normalized)}
          />
        ))}
        {visibleActions.length > 0 && (
          <section className="rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              <span>
                Outputs you can return
                <span className="ml-2 font-mono text-[9px] text-zinc-400">
                  {visibleActions.length}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-zinc-100 p-2 dark:border-zinc-800">
              {visibleActions.map((action) => (
                <code
                  key={action}
                  className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {action}
                </code>
              ))}
            </div>
          </section>
        )}
        {factCount === 0 && visibleActions.length === 0 && (
          <p className="rounded-md border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700">
            No fact or action matches “{query}”.
          </p>
        )}
      </div>
    </section>
  );
}
