"use client";

/**
 * SimStage — the simulation viewport shared by Studio and Lab: the maze, the
 * legend, and the debug panel. Identical presentation in both modes so the
 * two views read as one product.
 */

import { ReactNode } from "react";
import { SimStep } from "@/lib/engine/types";
import { World } from "@/lib/engine/world/world";
import { WorldLegend, WorldRenderer } from "@/app/components/renderers/WorldRenderer";
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
        <WorldRenderer world={world} />
        <WorldLegend world={world} />
      </div>
      <div className="flex flex-col gap-4">
        <DebugPanel step={step} />
        {footer}
      </div>
    </div>
  );
}

export { WorldLegend as SimLegend } from "@/app/components/renderers/WorldRenderer";
