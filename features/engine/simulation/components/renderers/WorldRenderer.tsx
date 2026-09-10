"use client";

import { MazeRenderer } from "@/features/engine/simulation/components/MazeRenderer";
import { FinanceRenderer } from "./FinanceRenderer";
import { ParkingRenderer } from "./ParkingRenderer";
import { World } from "@/lib/engine/world/world";

interface RendererProps {
  world: World;
  animationRate?: number;
}

const RENDERERS: Record<string, (props: RendererProps) => React.ReactNode> = {
  maze: MazeRenderer,
  finance: FinanceRenderer,
  parking: ParkingRenderer,
};

/** Resolve visual presentation by module id; unknown modules get the base grid. */
export function WorldRenderer({
  world,
  animationRate = 1,
}: RendererProps) {
  const Renderer = RENDERERS[world.module.id] ?? MazeRenderer;
  return <Renderer world={world} animationRate={animationRate} />;
}

export function WorldLegend({ world }: { world?: World }) {
  // Operational boards are self-describing (each renders
  // its own operational panel), so they need no separate tile legend.
  const id = world?.module.id;
  if (id === "finance" || id === "parking") return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
      <Legend color="bg-zinc-700" label="wall" />
      <Legend color="bg-zinc-300" label="visited" />
      <Legend color="bg-white ring-2 ring-inset ring-zinc-900" label="goal" />
      <Legend color="bg-zinc-100 ring-1 ring-inset ring-zinc-400" label="start" />
      <span className="flex items-center gap-1"><span className="font-semibold text-zinc-900 dark:text-zinc-100">▶</span> robot</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${color}`} />{label}</span>;
}
