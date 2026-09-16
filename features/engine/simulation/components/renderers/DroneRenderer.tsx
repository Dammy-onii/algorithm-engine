"use client";

/**
 * Drone surveillance sector view.
 *
 * The board is drawn from the drone's point of view, not the world's: ground the
 * sensor has not covered stays dark, and the target is only ever drawn once the
 * drone has actually detected it. Watching the fog retreat is the point — it is
 * the user's search strategy made visible.
 */

import { World } from "@/lib/engine/world/world";
import { key } from "@/lib/engine/world/grid";
import { droneDomain } from "@/lib/engine/worlds/drone";

const MAX_CELL = 46; // px — cap so a small sector doesn't fill the pane

/** Cell-to-cell flight time, matched to the simulation's playback speed. */
function motionDuration(animationRate: number): number {
  return Math.max(120, Math.floor(420 / Math.max(1, animationRate)));
}

export function DroneRenderer({
  world,
  animationRate = 1,
}: {
  world: World;
  animationRate?: number;
}) {
  const domain = droneDomain(world);
  if (!domain) return null;

  const { width, height, agent } = world;
  const { scanned, scanRadius, target, pad, detected, reported } = domain;

  const coverage =
    domain.searchableCount === 0
      ? 0
      : (scanned.size / domain.searchableCount) * 100;
  const battery =
    world.energyCapacity && agent.energy !== null
      ? (agent.energy / world.energyCapacity) * 100
      : null;

  const duration = motionDuration(animationRate);
  // Centre of a cell as a percentage of the board, for the free-flying drone.
  const centre = (value: number, span: number) => ((value + 0.5) / span) * 100;

  const inSensorRange = (x: number, y: number) =>
    Math.abs(x - agent.position.x) <= scanRadius &&
    Math.abs(y - agent.position.y) <= scanRadius;

  // Sitting on the dock reads as landed; anywhere else the drone is airborne.
  // The cast shadow and a small lift sell the altitude difference.
  const landed =
    pad !== null && pad.x === agent.position.x && pad.y === agent.position.y;

  const phase = reported
    ? { label: "Reported", tone: "text-emerald-400" }
    : detected
      ? { label: "Target detected", tone: "text-amber-400" }
      : { label: "Searching", tone: "text-sky-400" };

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        className="relative w-full rounded-lg bg-zinc-950 p-2"
        style={{
          maxWidth: width * MAX_CELL + 16,
          aspectRatio: `${width} / ${height}`,
        }}
      >
        {/* Ground: one tile per cell, dark until the sensor has covered it. */}
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
            gap: 2,
          }}
        >
          {Array.from({ length: height }).flatMap((_, y) =>
            Array.from({ length: width }).map((__, x) => {
              const covered = scanned.has(key({ x, y }));
              const sensing = inSensorRange(x, y);
              const isPad = pad !== null && pad.x === x && pad.y === y;
              const isTarget = detected && target.x === x && target.y === y;

              return (
                <div
                  key={`${x}-${y}`}
                  className={[
                    "relative flex items-center justify-center rounded-[3px] transition-colors",
                    // The dock is known infrastructure, so it keeps its own
                    // colour whether or not the sensor has been over it.
                    isPad
                      ? covered
                        ? "bg-teal-700"
                        : "bg-teal-900"
                      : covered
                        ? "bg-zinc-600"
                        : "bg-zinc-900",
                    // The target ring sits on the cell, not the marker, so it
                    // still reads when the drone is parked on top of it.
                    isTarget
                      ? reported
                        ? "ring-2 ring-inset ring-emerald-400"
                        : "ring-2 ring-inset ring-amber-400"
                      : sensing
                        ? "ring-1 ring-inset ring-sky-400/60"
                        : "",
                  ].join(" ")}
                  style={{ transitionDuration: `${duration}ms` }}
                  title={`(${x},${y})${covered ? " — scanned" : " — not searched"}`}
                >
                  {isPad && (
                    <span
                      className="flex h-[62%] w-[62%] items-center justify-center rounded-full border border-teal-300/80 text-[9px] font-bold text-teal-200"
                      aria-label="recharge pad"
                    >
                      ⌁
                    </span>
                  )}
                  {isTarget && (
                    <span className="relative flex h-full w-full items-center justify-center">
                      <span
                        className={`absolute h-[70%] w-[70%] rounded-full ${reported ? "bg-emerald-500/30" : "animate-pulse bg-amber-400/30"}`}
                      />
                      <span
                        className={`relative h-[34%] w-[34%] rounded-[2px] ${reported ? "bg-emerald-400" : "bg-amber-400"}`}
                        aria-label={reported ? "target reported" : "target detected"}
                      />
                    </span>
                  )}
                </div>
              );
            }),
          )}
        </div>

        {/* The drone flies above the grid so it can glide between cells. */}
        <span
          className="pointer-events-none absolute flex items-center justify-center"
          style={{
            left: `calc(${centre(agent.position.x, width)}% )`,
            top: `calc(${centre(agent.position.y, height)}% )`,
            width: `${100 / width}%`,
            height: `${100 / height}%`,
            transform: "translate(-50%, -50%)",
            transition: `left ${duration}ms ease-in-out, top ${duration}ms ease-in-out`,
          }}
          aria-label={`drone at ${agent.position.x}, ${agent.position.y}`}
        >
          {/* Cast shadow: tight and dark on the dock, wide and soft in the air. */}
          <span
            aria-hidden
            className="absolute rounded-[50%] bg-black"
            style={{
              width: landed ? "40%" : "62%",
              height: landed ? "14%" : "20%",
              bottom: landed ? "12%" : "-2%",
              opacity: landed ? 0.6 : 0.28,
              filter: `blur(${landed ? 1.5 : 3.5}px)`,
              transition: `all ${duration}ms ease-in-out`,
            }}
          />
          <span
            className="relative flex h-full w-full items-center justify-center"
            style={{
              transform: `translateY(${landed ? 0 : -12}%) scale(${landed ? 0.88 : 1.08})`,
              transition: `transform ${duration}ms ease-in-out`,
            }}
          >
            <Quadcopter spinning={!landed} />
          </span>
        </span>
      </div>

      <Telemetry
        phase={phase}
        coverage={coverage}
        battery={battery}
        energy={agent.energy}
        scanRadius={scanRadius}
      />
    </div>
  );
}

/** Top-down quadcopter: body, four arms, four rotor discs. */
function Quadcopter({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[78%] w-[78%] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
      role="img"
      aria-label="drone"
    >
      <g stroke="currentColor" className="text-zinc-100" strokeWidth={1.6} strokeLinecap="round">
        <line x1="7" y1="7" x2="17" y2="17" />
        <line x1="17" y1="7" x2="7" y2="17" />
      </g>
      {[
        [7, 7],
        [17, 7],
        [7, 17],
        [17, 17],
      ].map(([cx, cy], index) => (
        <circle
          key={index}
          cx={cx}
          cy={cy}
          r={3.4}
          className={`fill-sky-400/25 stroke-sky-300 ${spinning ? "animate-pulse" : ""}`}
          strokeWidth={1.1}
        />
      ))}
      <circle cx={12} cy={12} r={3.2} className="fill-zinc-100 stroke-zinc-400" strokeWidth={0.8} />
      <circle cx={12} cy={12} r={1.1} className="fill-sky-500" />
    </svg>
  );
}

function Telemetry({
  phase,
  coverage,
  battery,
  energy,
  scanRadius,
}: {
  phase: { label: string; tone: string };
  coverage: number;
  battery: number | null;
  energy: number | null;
  scanRadius: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
      <span className={`font-semibold ${phase.tone}`}>{phase.label}</span>

      <Meter
        label="Area searched"
        value={`${coverage.toFixed(0)}%`}
        fill={coverage}
        barClass="bg-sky-500"
      />

      {battery !== null && (
        <Meter
          label="Battery"
          value={`${energy}`}
          fill={battery}
          barClass={battery <= 25 ? "bg-red-500" : "bg-emerald-500"}
        />
      )}

      <span className="text-zinc-500 dark:text-zinc-400">
        Sensor radius <span className="font-mono text-zinc-700 dark:text-zinc-200">{scanRadius}</span>
      </span>
    </div>
  );
}

function Meter({
  label,
  value,
  fill,
  barClass,
}: {
  label: string;
  value: string;
  fill: number;
  barClass: string;
}) {
  return (
    <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
      {label}
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <span
          className={`block h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${Math.max(0, Math.min(100, fill))}%` }}
        />
      </span>
      <span className="font-mono text-zinc-700 dark:text-zinc-200">{value}</span>
    </span>
  );
}
