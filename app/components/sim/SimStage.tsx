"use client";

/**
 * SimStage — the simulation viewport shared by Studio and Lab: the maze, the
 * legend, and the debug panel. Identical presentation in both modes so the
 * two views read as one product.
 */

import { ReactNode } from "react";
import { SimStep } from "@/lib/engine/types";
import { World } from "@/lib/engine/world/world";
import { MazeRenderer } from "@/app/components/MazeRenderer";
import { DebugPanel } from "@/app/components/DebugPanel";

interface Props {
  world: World;
  step: SimStep;
  /** Stack the debug panel under the maze (Studio) or beside it (Lab). */
  layout?: "stacked" | "beside";
  /** Optional status content rendered under the debug panel (Studio banners). */
  footer?: ReactNode;
}

export function SimStage({ world, step, layout = "stacked", footer }: Props) {
  const wrap =
    layout === "beside"
      ? "flex flex-col gap-6 lg:flex-row lg:items-start"
      : "flex flex-col gap-4";

  return (
    <div className={wrap}>
      <div className="flex flex-col items-center gap-3">
        <MazeRenderer world={world} />
        <SimLegend />
      </div>
      <div className="flex flex-col gap-4">
        <DebugPanel step={step} />
        {footer}
      </div>
    </div>
  );
}

export function SimLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
      <Legend color="bg-zinc-700" label="wall" />
      <Legend color="bg-zinc-300" label="visited" />
      <Legend color="bg-white ring-2 ring-inset ring-zinc-900" label="goal" />
      <Legend color="bg-zinc-100 ring-1 ring-inset ring-zinc-400" label="start" />
      <span className="flex items-center gap-1">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">▶</span> robot
      </span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-3 w-3 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
