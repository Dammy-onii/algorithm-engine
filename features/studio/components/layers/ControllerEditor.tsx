"use client";

import { MAZE_CONTROLLER_TEMPLATE } from "@/lib/authoring/controllerCompiler";

interface Props {
  code: string;
  onChange: (code: string) => void;
}

export function ControllerEditor({ code, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">Code mode — one decision per tick</p>
        <p className="mt-1">
          Return a controller object with <code>decide(observation)</code>. It receives fresh
          sensor values every tick and returns one primitive action: <code>moveForward</code>,
          <code>turnLeft</code>, <code>turnRight</code>, or <code>wait</code>.
        </p>
        <p className="mt-1">
          Instance fields persist between ticks, so a class can remember that it turned and
          should move next. The engine still rejects unsafe movement and owns the world.
        </p>
      </div>
      <textarea
        className="h-96 w-full rounded-md border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        value={code}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-label="Controller code"
      />
      {!code && (
        <button
          onClick={() => onChange(MAZE_CONTROLLER_TEMPLATE)}
          className="self-start rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Insert maze controller example
        </button>
      )}
    </div>
  );
}

