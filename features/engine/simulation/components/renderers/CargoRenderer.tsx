"use client";

/**
 * Cargo recovery board.
 *
 * The whole manifest is visible from the start (unlike the search world), so the
 * board shows every crate with its weight and value, the depot, and the drone
 * carrying its current load. The tension the level is about — value against
 * weight against battery — is put on screen in the telemetry strip.
 *
 * The mission plan is drawn too: once a policy has run its selection and routing
 * steps, the chosen crates carry their position in the route. That makes the
 * pipeline visible — you can see whether a plan exists, what it picked, and in
 * what order it means to fly.
 */

import { World } from "@/lib/engine/world/world";
import { cargoDomain } from "@/lib/engine/worlds/cargo";

const MAX_CELL = 46;

function motionDuration(animationRate: number): number {
  return Math.max(120, Math.floor(420 / Math.max(1, animationRate)));
}

export function CargoRenderer({
  world,
  animationRate = 1,
}: {
  world: World;
  animationRate?: number;
}) {
  const domain = cargoDomain(world);
  if (!domain) return null;

  const { width, height, agent } = world;
  const { depot, objects, capacity, load, deliveredValue, valueTarget } = domain;
  const duration = motionDuration(animationRate);
  const centre = (v: number, span: number) => ((v + 0.5) / span) * 100;
  const landed = depot.x === agent.position.x && depot.y === agent.position.y;

  const battery =
    world.energyCapacity && agent.energy !== null
      ? (agent.energy / world.energyCapacity) * 100
      : null;
  const carried = objects.filter((o) => o.state === "carried");
  // Route position of each crate still to be collected on the current plan.
  const planOrder = new Map<string, number>();
  domain.plan
    .map((id) => objects.find((o) => o.id === id))
    .filter((o) => o !== undefined && o.state === "active")
    .forEach((o, i) => planOrder.set(o!.id, i + 1));
  const planned = [...planOrder.keys()].map((id) => objects.find((o) => o.id === id)!);
  const targetMet = deliveredValue >= valueTarget;
  const drainPerMove = 1 + Math.ceil(load * domain.drainPerWeight);

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        className="relative w-full rounded-lg bg-zinc-950 p-2"
        style={{ maxWidth: width * MAX_CELL + 16, aspectRatio: `${width} / ${height}` }}
      >
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
              const isDepot = depot.x === x && depot.y === y;
              const crate = objects.find(
                (o) => o.state === "active" && o.pos.x === x && o.pos.y === y,
              );
              return (
                <div
                  key={`${x}-${y}`}
                  className={[
                    "relative flex items-center justify-center rounded-[3px]",
                    isDepot ? "bg-teal-900 ring-2 ring-inset ring-teal-400" : "bg-zinc-800",
                  ].join(" ")}
                  title={
                    isDepot
                      ? "depot"
                      : crate
                        ? `crate w${crate.weight} · v${crate.value}`
                        : `(${x},${y})`
                  }
                >
                  {isDepot && (
                    <span className="text-[8px] font-bold uppercase tracking-wide text-teal-300">
                      DEPOT
                    </span>
                  )}
                  {crate && (
                    <Crate
                      weight={crate.weight}
                      value={crate.value}
                      order={planOrder.get(crate.id)}
                    />
                  )}
                </div>
              );
            }),
          )}
        </div>

        {/* Drone, with the docked/airborne depth cues from the search world. */}
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
          aria-label={`drone at ${agent.position.x}, ${agent.position.y} carrying ${carried.length}`}
        >
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
              transform: `translateY(${landed ? 0 : -12}%) scale(${landed ? 0.9 : 1.1})`,
              transition: `transform ${duration}ms ease-in-out`,
            }}
          >
            <Quadcopter spinning={!landed} laden={load > 0} />
            {carried.length > 0 && (
              <span
                className="absolute -bottom-[6%] flex h-[26%] min-w-[26%] items-center justify-center rounded-[2px] bg-amber-400 px-[2px] text-[7px] font-bold text-zinc-900"
                aria-label={`${carried.length} crates aboard`}
              >
                {carried.length}
              </span>
            )}
          </span>
        </span>
      </div>

      <Telemetry
        load={load}
        capacity={capacity}
        deliveredValue={deliveredValue}
        valueTarget={valueTarget}
        targetMet={targetMet}
        battery={battery}
        energy={agent.energy}
        drainPerMove={drainPerMove}
        carriedCount={carried.length}
        planCount={planned.length}
        planValue={planned.reduce((sum, o) => sum + o.value, 0)}
        planRouted={domain.planRouted}
      />
    </div>
  );
}

function Crate({ weight, value, order }: { weight: number; value: number; order?: number }) {
  const selected = order !== undefined;
  return (
    <span
      className={[
        "relative flex h-[74%] w-[74%] flex-col items-center justify-center rounded-[2px] leading-none text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.5)]",
        selected ? "bg-orange-200 ring-2 ring-sky-400" : "bg-orange-300",
      ].join(" ")}
    >
      <span className="text-[8px] font-bold">v{value}</span>
      <span className="text-[6px] opacity-70">{weight}kg</span>
      {selected && (
        <span
          className="absolute -right-[12%] -top-[18%] flex h-[46%] min-w-[46%] items-center justify-center rounded-full bg-sky-400 px-[2px] text-[7px] font-bold text-zinc-900"
          aria-label={`stop ${order} on the planned route`}
        >
          {order}
        </span>
      )}
    </span>
  );
}

function Quadcopter({ spinning, laden }: { spinning: boolean; laden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[76%] w-[76%] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" role="img" aria-label="drone">
      <g stroke="currentColor" className="text-zinc-100" strokeWidth={1.6} strokeLinecap="round">
        <line x1="7" y1="7" x2="17" y2="17" />
        <line x1="17" y1="7" x2="7" y2="17" />
      </g>
      {[[7, 7], [17, 7], [7, 17], [17, 17]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3.4} className={`fill-sky-400/25 stroke-sky-300 ${spinning ? "animate-pulse" : ""}`} strokeWidth={1.1} />
      ))}
      <circle cx={12} cy={12} r={3.2} className={laden ? "fill-amber-300 stroke-amber-500" : "fill-zinc-100 stroke-zinc-400"} strokeWidth={0.8} />
      <circle cx={12} cy={12} r={1.1} className="fill-sky-500" />
    </svg>
  );
}

function Telemetry({
  load, capacity, deliveredValue, valueTarget, targetMet, battery, energy, drainPerMove, carriedCount,
  planCount, planValue, planRouted,
}: {
  load: number; capacity: number; deliveredValue: number; valueTarget: number;
  targetMet: boolean; battery: number | null; energy: number | null; drainPerMove: number; carriedCount: number;
  planCount: number; planValue: number; planRouted: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
      <span className={`font-semibold ${targetMet ? "text-emerald-400" : "text-sky-400"}`}>
        {targetMet ? "Target met" : "Recovering"}
      </span>
      <Meter label="Value" value={`${deliveredValue}/${valueTarget}`} fill={(deliveredValue / valueTarget) * 100} barClass={targetMet ? "bg-emerald-500" : "bg-sky-500"} />
      <Meter label="Load" value={`${load}/${capacity}`} fill={(load / capacity) * 100} barClass={load >= capacity ? "bg-amber-500" : "bg-zinc-400"} />
      {battery !== null && (
        <Meter label="Battery" value={`${energy}`} fill={battery} barClass={battery <= 25 ? "bg-red-500" : "bg-emerald-500"} />
      )}
      <span className="text-zinc-500 dark:text-zinc-400">Drain/move <span className="font-mono text-zinc-700 dark:text-zinc-200">{drainPerMove}</span></span>
      <span className="text-zinc-500 dark:text-zinc-400">Aboard <span className="font-mono text-zinc-700 dark:text-zinc-200">{carriedCount}</span></span>
      <span className="text-zinc-500 dark:text-zinc-400">
        Plan{" "}
        <span className="font-mono text-zinc-700 dark:text-zinc-200">
          {planCount === 0 ? "none" : `${planCount} crates · v${planValue}`}
        </span>
        {planCount > 0 && (
          <span className={`ml-1 font-semibold ${planRouted ? "text-sky-400" : "text-amber-400"}`}>
            {planRouted ? "routed" : "unrouted"}
          </span>
        )}
      </span>
    </div>
  );
}

function Meter({ label, value, fill, barClass }: { label: string; value: string; fill: number; barClass: string }) {
  return (
    <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
      {label}
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <span className={`block h-full rounded-full transition-all ${barClass}`} style={{ width: `${Math.max(0, Math.min(100, fill))}%` }} />
      </span>
      <span className="font-mono text-zinc-700 dark:text-zinc-200">{value}</span>
    </span>
  );
}
