"use client";

/**
 * SimStage — the simulation viewport shared by Studio and Lab: the maze, the
 * legend, and the debug panel. Identical presentation in both modes so the
 * two views read as one product.
 */

import { ReactNode } from "react";
import { SimStep } from "@/lib/engine/types";
import { World } from "@/lib/engine/world/world";
import { WorldLegend, WorldRenderer } from "@/features/simulation/components/renderers/WorldRenderer";
import { DebugPanel } from "@/features/simulation/components/DebugPanel";

interface Props {
  world: World;
  step: SimStep;
  /** Stack the debug panel under the maze (Studio) or beside it (Lab). */
  layout?: "stacked" | "beside";
  /** Optional status content rendered under the debug panel (Studio banners). */
  footer?: ReactNode;
  /** Simulation ticks per second; domain renderers use it to finish motion before the next tick. */
  animationRate?: number;
}

export function SimStage({
  world,
  step,
  layout = "stacked",
  footer,
  animationRate = 1,
}: Props) {
  const wrap =
    layout === "beside"
      ? "flex flex-col gap-6 lg:flex-row lg:items-start"
      : "flex flex-col gap-4";

  return (
    <div className={wrap}>
      <div className="flex flex-col items-center gap-3">
        <WorldRenderer world={world} animationRate={animationRate} />
        <WorldLegend world={world} />
      </div>
      <div className="flex flex-col gap-4">
        <DebugPanel step={step} />
        {footer}
      </div>
    </div>
  );
}

export { WorldLegend as SimLegend } from "@/features/simulation/components/renderers/WorldRenderer";
