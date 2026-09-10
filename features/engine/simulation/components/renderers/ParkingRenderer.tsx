"use client";

/**
 * Smart-parking operations board.
 *
 * The engine data is intentionally not a tile map. This renderer turns spaces,
 * arrivals, assignments, and departures into a recognisable top-down facility:
 * two marked parking rows, one drive aisle, an entrance queue, and an exit.
 */

import type { CSSProperties } from "react";
import parkingAtlas from "@/assets/parking/spritesheet/CP_V1.0.4.png";
import { World } from "@/lib/engine/world/world";
import {
  ParkingRuntimeVehicle,
  ParkingSpace,
  currentParkingVehicle,
  departedVehicles,
  isParkingSpaceClosed,
  occupantForSpace,
  parkedVehicles,
  parkingRuntime,
  readyToLeaveVehicles,
  waitingVehicles,
} from "@/lib/engine/worlds/parking";

const SPACE_LABEL: Record<ParkingSpace["kind"], string> = {
  standard: "P",
  charging: "EV",
  large: "L",
  premium: "VIP",
  accessible: "A",
  reserved: "R",
};

export function parkingMotionDuration(animationRate: number): number {
  return Math.max(220, Math.floor(820 / Math.max(1, animationRate)));
}

export function parkingBayWaypoint(
  space: Pick<ParkingSpace, "row" | "order">,
  rowSize: number,
): { x: number; y: number; rotation: string } {
  return {
    x: ((space.order + 0.5) / Math.max(1, rowSize)) * 100,
    y: space.row === "north" ? 23 : 83,
    rotation: space.row === "north" ? "0deg" : "180deg",
  };
}

export function ParkingRenderer({
  world,
  animationRate = 1,
}: {
  world: World;
  animationRate?: number;
}) {
  const runtime = parkingRuntime(world);
  if (!runtime) return null;

  const queue = waitingVehicles(world);
  const exitQueue = readyToLeaveVehicles(world);
  const head = currentParkingVehicle(world);
  const exitHead = exitQueue[0];
  const parked = parkedVehicles(world).length;
  const departed = departedVehicles(world).length;
  const north = runtime.spaces
    .filter((space) => space.row === "north")
    .sort((a, b) => a.order - b.order);
  const south = runtime.spaces
    .filter((space) => space.row === "south")
    .sort((a, b) => a.order - b.order);
  const activeArrival = runtime.vehicles.find(
    (vehicle) => vehicle.status === "entering",
  );
  const activeDeparture = runtime.vehicles.find(
    (vehicle) => vehicle.status === "exiting",
  );
  const departureIsLive =
    runtime.lastDepartureTick !== undefined &&
    world.tick - runtime.lastDepartureTick <= 1;
  const assignmentIsLive =
    runtime.lastAssignmentTick !== undefined &&
    world.tick - runtime.lastAssignmentTick <= 1;
  const assignedVehicle = activeArrival ?? (assignmentIsLive
    ? runtime.vehicles.find(
        (vehicle) => vehicle.id === runtime.lastAssignedVehicleId,
      )
    : undefined);
  const assignedSpace = assignedVehicle?.assignedSpaceId
    ? runtime.spaces.find(
        (space) => space.id === assignedVehicle.assignedSpaceId,
      )
    : undefined;
  const departedVehicle = activeDeparture ?? (departureIsLive
    ? runtime.vehicles.find(
        (vehicle) => vehicle.id === runtime.lastDepartedVehicleId,
      )
    : undefined);
  const departedSpace = departedVehicle?.assignedSpaceId
    ? runtime.spaces.find(
        (space) => space.id === departedVehicle.assignedSpaceId,
      )
    : undefined;
  const motionDuration = parkingMotionDuration(animationRate);
  const boardStyle = {
    "--parking-motion-duration": `${motionDuration}ms`,
    "--parking-arrival-duration": `${Math.max(120, Math.floor(motionDuration * 0.35))}ms`,
  } as CSSProperties;

  return (
    <div
      className="parking-board w-full overflow-hidden rounded-lg border border-zinc-300 bg-zinc-800 text-white shadow-sm dark:border-zinc-700"
      style={boardStyle}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 bg-zinc-900 px-3 py-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">ParkFlow operations</h2>
          <p className="text-[10px] text-zinc-400">Entrance → allocation controller → parking → authorized exit</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px] tabular-nums text-zinc-300">
          <Metric label="queued" value={queue.length} />
          <Metric label="parked" value={parked} />
          <Metric label="lane" value={`${runtime.vehicles.filter((vehicle) => vehicle.status === "entering" || vehicle.status === "exiting").length}/${runtime.laneCapacity}`} />
          <Metric label="departed" value={`${departed}/${runtime.vehicles.length}`} />
          <Metric label="abandoned" value={runtime.abandoned} alert={runtime.abandoned > 0} />
          <Metric label="violations" value={runtime.violations} alert={runtime.violations > 0} />
          <Metric label="tick" value={world.tick} />
        </div>
      </header>

      <div className="p-3">
        <div className="mb-2 grid gap-2 parking-operations-strip">
          <OperationsPanel title="Entrance queue">
            <div className="flex min-h-12 items-center gap-1.5 overflow-hidden">
              {queue.length ? (
                queue.slice(0, 5).map((vehicle, index) => (
                  <div
                    key={vehicle.id}
                    className={[
                      "parking-car-arrive flex shrink-0 items-center gap-1 rounded border px-1.5 py-1",
                      index === 0
                        ? "border-white bg-white text-zinc-900 motion-safe:animate-pulse"
                        : "border-white/20 bg-black/15 text-zinc-200",
                    ].join(" ")}
                  >
                    <CarSprite vehicle={vehicle} small />
                    <span className="font-mono text-[9px]">{vehicle.id}</span>
                  </div>
                ))
              ) : (
                <span className="text-[10px] text-zinc-400">No vehicle waiting</span>
              )}
              {queue.length > 5 && <span className="text-[10px] text-zinc-400">+{queue.length - 5}</span>}
            </div>
          </OperationsPanel>

          <FlowArrow />

          <OperationsPanel title="Allocation controller">
            <div className="flex min-h-12 items-center gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded border border-white/40 bg-zinc-950 font-mono text-[9px] font-bold">
                AI
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">
                  {head ? `Classifying ${head.id}` : "Monitoring the entrance"}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                  {head ? vehicleRequirement(head) : "Waiting for the next arrival"}
                </p>
              </div>
            </div>
          </OperationsPanel>

          <FlowArrow />

          <OperationsPanel title={`Exit checkpoint · ${exitQueue.length}`}>
            <div className="flex min-h-12 items-center gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded border border-white/40 bg-zinc-950 font-mono text-[8px] font-bold">
                EXIT
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">
                  {exitHead ? `${exitHead.id} waiting for approval` : "No exit request"}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                  {exitHead ? "Still occupying its bay" : "Checkpoint monitoring parked cars"}
                </p>
              </div>
            </div>
          </OperationsPanel>
        </div>

        <div className="relative rounded-md border border-white/15 bg-zinc-700 p-2 shadow-inner">
          <div className="mb-1 flex items-center justify-between text-[9px] font-semibold uppercase tracking-widest text-zinc-300">
            <span>Entry gate</span>
            <span>Exit gate</span>
          </div>

          <ParkingRow
            spaces={north}
            world={world}
            facing="south"
            movingVehicleId={assignedVehicle?.id}
            departingVehicleId={departedVehicle?.id}
          />

          <div className="relative my-2 flex min-h-14 items-center overflow-hidden rounded bg-zinc-600/80 px-3">
            <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-amber-200/60" />
            <span className="relative rounded bg-zinc-900/80 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-200">
              One-way allocation aisle
            </span>
            <div className="relative ml-auto flex items-center gap-2">
              {assignedVehicle && (
                <span className="flex items-center gap-1 rounded bg-white px-2 py-1 font-mono text-[9px] text-zinc-900">
                  {assignedVehicle.id} → {assignedVehicle.assignedSpaceId}
                </span>
              )}
              {departedVehicle && (
                <div className="flex items-center gap-1 rounded border border-white/30 bg-zinc-900/70 px-1.5 py-1">
                  <span className="font-mono text-[9px]">checkpoint cleared</span>
                </div>
              )}
            </div>
          </div>

          <ParkingRow
            spaces={south}
            world={world}
            facing="north"
            movingVehicleId={assignedVehicle?.id}
            departingVehicleId={departedVehicle?.id}
          />

          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-md">
            {assignedVehicle && assignedSpace && (
              <RouteCar
                key={`arrival-${assignedVehicle.id}-${runtime.lastAssignmentTick}`}
                vehicle={assignedVehicle}
                space={assignedSpace}
                rowSize={assignedSpace.row === "north" ? north.length : south.length}
                direction="in"
              />
            )}
            {departedVehicle && departedSpace && (
              <RouteCar
                key={`departure-${departedVehicle.id}-${departedVehicle.exitStartedAt ?? runtime.lastDepartureTick}`}
                vehicle={departedVehicle}
                space={departedSpace}
                rowSize={departedSpace.row === "north" ? north.length : south.length}
                direction="out"
              />
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-zinc-300">
          <LegendToken mark="P" label="standard" />
          <LegendToken mark="EV" label="charging" />
          <LegendToken mark="L" label="large" />
          <LegendToken mark="VIP" label="premium" />
          <LegendToken mark="A" label="accessible" />
          <LegendToken mark="R" label="reserved" />
        </div>
      </div>
    </div>
  );
}

function ParkingRow({
  spaces,
  world,
  facing,
  movingVehicleId,
  departingVehicleId,
}: {
  spaces: ParkingSpace[];
  world: World;
  facing: "north" | "south";
  movingVehicleId?: string;
  departingVehicleId?: string;
}) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${spaces.length}, minmax(3rem, 1fr))` }}
    >
      {spaces.map((space) => {
        const occupant = occupantForSpace(world, space.id);
        const closed = isParkingSpaceClosed(space, world.tick);
        return (
          <div
            key={space.id}
            className={[
              "relative flex min-h-20 flex-col items-center justify-between overflow-hidden border-x-2 border-white/70 bg-zinc-600/35 px-1 py-1",
              facing === "south" ? "border-t-2" : "border-b-2",
              space.kind !== "standard" ? "parking-special-space" : "",
              closed ? "border-red-400 bg-red-950/70 opacity-75" : "",
            ].join(" ")}
            title={`${space.id} · ${space.kind}${space.reservedFor ? ` · reserved for ${space.reservedFor}` : ""}`}
          >
            <span className="self-start rounded bg-zinc-900/70 px-1 font-mono text-[8px] text-zinc-300">
              {space.id}
            </span>
            {occupant &&
            occupant.status !== "entering" &&
            occupant.id !== departingVehicleId ? (
              <div
                className={[
                  "parking-car-park relative",
                  facing === "south" ? "rotate-180" : "",
                  occupant.status === "ready" ? "parking-car-ready" : "",
                  occupant.id === movingVehicleId
                    ? "parking-occupant-arriving"
                    : "",
                ].join(" ")}
              >
                <CarSprite vehicle={occupant} />
                {occupant.status === "ready" && (
                  <span className="absolute -right-3 -top-2 rounded bg-amber-300 px-1 text-[6px] font-bold text-zinc-900">
                    EXIT
                  </span>
                )}
              </div>
            ) : (
              <span className="grid h-10 place-items-center text-[11px] font-bold text-white/70">
                {closed
                  ? "CLOSED"
                  : occupant?.status === "entering"
                    ? "INBOUND"
                    : SPACE_LABEL[space.kind]}
              </span>
            )}
            <span className="text-[7px] uppercase tracking-wide text-zinc-300">
              {space.zone ? `${space.zone} · ` : ""}{space.kind}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RouteCar({
  vehicle,
  space,
  rowSize,
  direction,
}: {
  vehicle: ParkingRuntimeVehicle;
  space: ParkingSpace;
  rowSize: number;
  direction: "in" | "out";
}) {
  const waypoint = parkingBayWaypoint(space, rowSize);
  const style = {
    "--parking-target-x": `${waypoint.x}%`,
    "--parking-target-y": `${waypoint.y}%`,
    "--parking-bay-rotation": waypoint.rotation,
  } as CSSProperties;

  return (
    <div
      className={
        direction === "in"
          ? "parking-route-car parking-route-in"
          : "parking-route-car parking-route-out"
      }
      style={style}
      aria-label={`${vehicle.id} ${direction === "in" ? "driving to" : "leaving"} ${space.id}`}
    >
      <CarSprite vehicle={vehicle} />
    </div>
  );
}

function CarSprite({
  vehicle,
  small = false,
}: {
  vehicle?: ParkingRuntimeVehicle;
  small?: boolean;
}) {
  if (!vehicle) return null;
  const large = vehicle.size === "large";
  // Atlas coordinates are halved because the 1024px source is rendered with a
  // 512px background. These regions are the pack's top-down vehicles.
  const position = large
    ? "-136px -200px"
    : vehicle.electric
      ? "-152px -240px"
      : vehicle.vip
        ? "-120px -240px"
        : vehicle.accessiblePermit
          ? "-152px -240px"
          : "-120px -240px";

  return (
    <span
      aria-label={`${vehicle.id} vehicle`}
      className="block shrink-0 bg-no-repeat"
      style={{
        width: small ? (large ? 24 : 18) : large ? 28 : 20,
        height: small ? 24 : large ? 34 : 32,
        backgroundImage: `url(${parkingAtlas.src})`,
        backgroundPosition: position,
        backgroundSize: "512px 512px",
        transform: small ? "scale(.72)" : undefined,
        transformOrigin: "center",
      }}
    />
  );
}

function vehicleRequirement(vehicle: ParkingRuntimeVehicle): string {
  if (vehicle.reservation) return `Reservation · ${vehicle.reservation}`;
  if (vehicle.accessiblePermit) return "Accessible permit";
  if (vehicle.vip) return "VIP access";
  if (vehicle.electric) return "Electric · charging required";
  if (vehicle.size === "large") return "Large vehicle";
  return "Standard compact vehicle";
}

function OperationsPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-white/15 bg-zinc-900/55 p-2">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      {children}
    </section>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-zinc-400">
      <span className="hidden text-lg parking-horizontal-arrow">→</span>
      <span className="text-lg parking-vertical-arrow">↓</span>
    </div>
  );
}

function Metric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <span className={alert ? "rounded bg-red-700 px-1.5 py-0.5" : "rounded bg-white/10 px-1.5 py-0.5"}>
      {label} {value}
    </span>
  );
}

function LegendToken({ mark, label }: { mark: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="grid min-w-4 place-items-center rounded border border-white/40 px-0.5 text-[7px] font-bold">{mark}</span>
      {label}
    </span>
  );
}
