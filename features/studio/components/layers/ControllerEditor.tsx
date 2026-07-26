"use client";

import {
  FINANCE_CONTROLLER_TEMPLATE,
  MAZE_CONTROLLER_TEMPLATE,
} from "@/lib/authoring/controllerCompiler";

interface Props {
  code: string;
  domain: string;
  availableActions: string[];
  onChange: (code: string) => void;
}

export function ControllerEditor({
  code,
  domain,
  availableActions,
  onChange,
}: Props) {
  const template =
    domain === "finance"
      ? FINANCE_CONTROLLER_TEMPLATE
      : domain === "maze"
        ? MAZE_CONTROLLER_TEMPLATE
        : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">Code mode — one decision per tick</p>
        <p className="mt-1">
          Return a controller object with <code>decide(observation)</code>. It receives fresh
          sensor values every tick and returns one primitive action available in
          this world.
        </p>
        <p className="mt-1">
          Instance fields persist between ticks, so a class can remember that it turned and
          should move next. The engine still rejects unsafe movement and owns the world.
        </p>
        {domain !== "maze" && (
          <p className="mt-1">
            World-specific facts are inside <code>observation.domain</code>.
            Base facts such as <code>tick</code> remain directly on the observation.
          </p>
        )}
      </div>
      {availableActions.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Actions this controller may return
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
      />
      {!code && template && (
        <button
          onClick={() => onChange(template)}
          className="self-start rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Insert {domain === "finance" ? "Finance" : "maze"} controller example
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
