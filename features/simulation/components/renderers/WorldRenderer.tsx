"use client";

import { MazeRenderer } from "@/features/simulation/components/MazeRenderer";
import { WarehouseRenderer } from "./WarehouseRenderer";
import { FinanceRenderer } from "./FinanceRenderer";
import { ParkingRenderer } from "./ParkingRenderer";
import { World } from "@/lib/engine/world/world";
import { warehouseRuntime } from "@/lib/engine/worlds/warehouse";

interface RendererProps {
  world: World;
  animationRate?: number;
}

const RENDERERS: Record<string, (props: RendererProps) => React.ReactNode> = {
  maze: MazeRenderer,
  warehouse: WarehouseRenderer,
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
  // The finance board is self-describing (it renders its own provider + tally
  // panel), so it needs no separate tile legend.
  if (world?.module.id === "finance" || world?.module.id === "parking") return null;
  const warehouse = world?.module.id === "warehouse";
  const hasCharger = warehouse && world ? (warehouseRuntime(world)?.chargingStations.length ?? 0) > 0 : false;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
      <Legend color="bg-zinc-700" label={warehouse ? "shelf" : "wall"} />
      <Legend color="bg-zinc-300" label="visited" />
      {warehouse ? (
        <>
          <Legend color="border border-zinc-900 bg-white" label="package" />
          <Legend color="bg-zinc-900" label="delivery" />
          {hasCharger && <Legend color="border border-zinc-900 bg-zinc-200" label="charger" />}
        </>
      ) : <Legend color="bg-white ring-2 ring-inset ring-zinc-900" label="goal" />}
      <Legend color="bg-zinc-100 ring-1 ring-inset ring-zinc-400" label="start" />
      <span className="flex items-center gap-1"><span className="font-semibold text-zinc-900 dark:text-zinc-100">▶</span> robot</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${color}`} />{label}</span>;
}
