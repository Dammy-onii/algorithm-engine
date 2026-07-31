"use client";

import {
  FINANCE_CONTROLLER_STARTER,
  MAZE_CONTROLLER_STARTER,
  PARKING_CONTROLLER_STARTER,
  WAREHOUSE_CONTROLLER_STARTER,
} from "@/lib/authoring/controllerCompiler";
import {
  ControllerReference,
  type ControllerFactReference,
} from "./ControllerReference";

interface Props {
  code: string;
  domain: string;
  availableActions: string[];
  /** Whether this world is grid-based (shows the wall/goal senses). */
  gridWorld: boolean;
  /** World-specific facts read from observation.domain, with labels. */
  observableDomain: ControllerFactReference[];
  onChange: (code: string) => void;
}

const TEMPLATES: Record<string, string> = {
  maze: MAZE_CONTROLLER_STARTER,
  warehouse: WAREHOUSE_CONTROLLER_STARTER,
  finance: FINANCE_CONTROLLER_STARTER,
  parking: PARKING_CONTROLLER_STARTER,
};

// Base senses that live directly on the observation (not observation.domain).
const GRID_BASE_FIELDS = [
  "atGoal", "wallAhead", "wallLeft", "wallRight", "goalVisible", "goalAhead",
  "visitedAhead", "visitedCount", "energy", "tick", "position", "direction",
];
const NON_GRID_BASE_FIELDS = ["tick"];

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ControllerEditor({
  code,
  domain,
  availableActions,
  gridWorld,
  observableDomain,
  onChange,
}: Props) {
  const template = TEMPLATES[domain] ?? MAZE_CONTROLLER_STARTER;
  const baseFields = gridWorld ? GRID_BASE_FIELDS : NON_GRID_BASE_FIELDS;

  return (
    <div className="flex flex-col gap-3">
      <details className="group rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          <span>How Code Controller works</span>
          <span className="text-zinc-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="border-t border-zinc-200 px-3 py-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <p>
            Return a controller object with <code>decide(observation)</code>. It is
            called once every tick with fresh sensor values and returns one action.
          </p>
          <p className="mt-1">
            Instance fields persist between ticks. The engine validates the action
            and owns the world, clock, trace, and objectives. Opening this view does
            not activate Code Controller; use the controller selector above.
          </p>
        </div>
      </details>

      <ControllerReference
        baseFields={baseFields}
        domainFacts={observableDomain}
        actions={availableActions}
      />

      <textarea
        className="h-96 w-full rounded-md border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        value={code}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-label="Controller code"
        placeholder={`Press "Insert ${titleCase(domain)} starter" below for the base class and decide() method.`}
      />
      {!code && (
        <button
          onClick={() => onChange(template)}
          className="self-start rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Insert {titleCase(domain)} starter
        </button>
      )}
      <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">
        Demo mode: Submit solution requests the interview scenarios, then runs
        this Code Controller in your browser. The result is useful for the demo
        but is not a protected or tamper-proof interview score.
      </p>
    </div>
  );
}
