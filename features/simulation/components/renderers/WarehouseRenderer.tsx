"use client";

import { Direction, TILE } from "@/lib/engine/types";
import { World } from "@/lib/engine/world/world";
import { key } from "@/lib/engine/world/grid";
import {
  chargingStationAt,
  deliveryZoneAt,
  packageAt,
  stationAt,
} from "@/lib/engine/worlds/warehouse";

const ROTATION: Record<Direction, number> = { E: 0, S: 90, W: 180, N: 270 };
const MAX_CELL = 40;

/** Warehouse-specific board presentation. Domain queries stay in this renderer. */
export function WarehouseRenderer({ world }: { world: World }) {
  const { tiles, width, height, agent, start } = world;
  const gap = 2;
  const pad = 8;

  return (
    <div
      className="grid w-full rounded-lg bg-zinc-900"
      style={{
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        gap,
        padding: pad,
        maxWidth: width * MAX_CELL + (width - 1) * gap + pad * 2,
        aspectRatio: `${width} / ${height}`,
      }}
    >
      {tiles.flatMap((row, y) => row.map((code, x) => {
        const position = { x, y };
        const isAgent = agent.position.x === x && agent.position.y === y;
        const isStart = start.x === x && start.y === y;
        const waitingPackage = packageAt(world, position);
        const deliveryZone = deliveryZoneAt(world, position);
        const chargingStation = chargingStationAt(world, position);
        const packageStation = stationAt(world, position);
        const visited = agent.visited.has(key(position));

        let cls = "bg-zinc-100";
        if (code === TILE.WALL) cls = "bg-zinc-700";
        else if (deliveryZone) cls = "bg-white ring-2 ring-inset ring-zinc-900";
        else if (visited) cls = "bg-zinc-300";
        else if (isStart) cls = "bg-zinc-100 ring-1 ring-inset ring-zinc-400";

        return (
          <div
            key={`${x}-${y}`}
            className={`flex aspect-square items-center justify-center rounded-[3px] ${cls}`}
            title={`warehouse (${x},${y})${waitingPackage ? ` · ${waitingPackage.type ?? ""} package ${waitingPackage.id}` : ""}${packageStation ? ` · station ${packageStation.id}: ${packageStation.remaining}/${packageStation.total}` : ""}${deliveryZone ? ` · delivery ${deliveryZone.id}` : ""}${chargingStation ? ` · charging ${chargingStation.id}` : ""}`}
          >
            {isAgent ? (
              <span className="relative flex h-full w-full items-center justify-center">
                <svg viewBox="0 0 10 10" className="h-[46%] w-[46%] fill-zinc-900" style={{ transform: `rotate(${ROTATION[agent.direction]}deg)` }} aria-label={`robot facing ${agent.direction}`}>
                  <path d="M2 1 L9 5 L2 9 Z" />
                </svg>
                {agent.cargo.length > 0 && <span className="absolute bottom-[10%] right-[10%] h-[22%] w-[22%] rounded-[1px] border border-zinc-900 bg-white" aria-label={`${agent.cargo.length} package carried`} />}
              </span>
            ) : waitingPackage ? (
              <span className="flex h-[42%] w-[42%] items-center justify-center rounded-[2px] border border-zinc-900 bg-white text-[8px] font-bold leading-none text-zinc-900">{waitingPackage.type === "red" ? "R" : waitingPackage.type === "blue" ? "B" : "P"}</span>
            ) : deliveryZone ? (
              <span className="flex h-[42%] w-[42%] items-center justify-center rounded-full bg-zinc-900 text-[8px] font-bold leading-none text-white">{deliveryZone.acceptsType === "red" ? "R" : deliveryZone.acceptsType === "blue" ? "B" : "D"}</span>
            ) : chargingStation ? (
              <span className="flex h-[42%] w-[42%] items-center justify-center rounded border border-zinc-900 bg-zinc-200 text-[8px] font-bold leading-none text-zinc-900">C</span>
            ) : null}
          </div>
        );
      }))}
    </div>
  );
}
