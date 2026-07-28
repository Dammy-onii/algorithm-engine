"use client";

import { useEffect } from "react";
import {
  FINANCE_CONTROLLER_STARTER,
  MAZE_CONTROLLER_STARTER,
  PARKING_CONTROLLER_STARTER,
  WAREHOUSE_CONTROLLER_STARTER,
} from "@/lib/authoring/controllerCompiler";

interface Props {
  code: string;
  domain: string;
  availableActions: string[];
  /** Whether this world is grid-based (shows the wall/goal senses). */
  gridWorld: boolean;
  /** World-specific facts read from observation.domain, with labels. */
  observableDomain: { id: string; label: string }[];
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

  // Open the Code tab with a working boilerplate rather than a blank box. It
  // fills only when empty, so a learner's own code is never overwritten; clearing
  // the editor returns to the visual rules.
  useEffect(() => {
    if (!code) onChange(template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">Code mode — one decision per tick</p>
        <p className="mt-1">
          Return a controller object with <code>decide(observation)</code>. It is called
          once every tick with fresh sensor values and returns exactly one action string.
        </p>
        <p className="mt-1">
          Instance fields persist between ticks — that is how a class remembers it just
          turned and should move next. The engine turns an unsafe action into a wait and
          owns the world, clock, trace, and objectives.
        </p>
        <p className="mt-1">
          The tab opens with an editable boilerplate. While it has code, Apply &amp; Run
          uses this controller; <strong>clear the editor</strong> to run your visual rules
          instead.
        </p>
      </div>

      {/* What you can observe */}
      <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Read from <code>observation</code>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {baseFields.map((field) => (
            <code
              key={field}
              className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              observation.{field}
            </code>
          ))}
        </div>

        {observableDomain.length > 0 && (
          <>
            <p className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Read from <code>observation.domain</code> — this world&apos;s facts
            </p>
            <div className="flex flex-wrap gap-1.5">
              {observableDomain.map((field) => (
                <code
                  key={field.id}
                  title={field.label}
                  className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  observation.domain.{field.id}
                </code>
              ))}
            </div>
          </>
        )}
      </div>

      {availableActions.length > 0 && (
        <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Return one of these actions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableActions.map((action) => (
              <code
                key={action}
                className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {action}
              </code>
            ))}
          </div>
        </div>
      )}

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
        Code mode currently runs only for local Apply &amp; Run. Interview Submit
        evaluates the visual rules policy because arbitrary candidate JavaScript
        still requires an isolated server worker.
      </p>
    </div>
  );
}
