"use client";

/**
 * SimControls — the transport bar shared by Studio and Lab.
 *
 * Start/Pause, Step, Reset, and a Speed slider, styled identically in both
 * modes so the two views read as one product. Mode-specific selectors (e.g.
 * Lab's world/brain dropdowns) are passed as `leading` and rendered on the left.
 */

import { ReactNode } from "react";

interface Props {
  running: boolean;
  done: boolean;
  speed: number;
  onToggleRun: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (n: number) => void;
  /** Interview-scale streams can opt into fast-forward; defaults to 3 ticks/s. */
  maxSpeed?: number;
  /** Optional mode-specific controls rendered before the transport buttons. */
  leading?: ReactNode;
}

const BTN =
  "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";
const GHOST =
  "rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200/60 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function SimControls({
  running,
  done,
  speed,
  onToggleRun,
  onStep,
  onReset,
  onSpeedChange,
  maxSpeed = 3,
  leading,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      {leading}
      {leading ? <div className="mx-1 h-6 w-px bg-zinc-300 dark:bg-zinc-700" /> : null}

      <button className={BTN} onClick={onToggleRun} disabled={done}>
        {running ? "Pause" : "Start"}
      </button>
      <button className={GHOST} onClick={onStep} disabled={running || done}>
        Step
      </button>
      <button className={GHOST} onClick={onReset}>
        Reset
      </button>

      <label className="ml-2 flex items-center gap-2 text-sm text-zinc-500">
        Speed
        <input
          type="range"
          min={1}
          max={maxSpeed}
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="w-24"
        />
        <span className="w-10 font-mono text-xs">{speed}/s</span>
      </label>
    </div>
  );
}
