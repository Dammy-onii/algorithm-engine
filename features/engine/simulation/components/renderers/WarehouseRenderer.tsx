"use client";

/**
 * Warehouse yard, rendered in 3D with Three.js.
 *
 * The scene itself lives in `warehouse/scene.ts`; this component mounts it,
 * pushes each tick's world state into it, and draws the HTML overlay: live
 * stats, floating labels pinned to the forklift (with the rule that fired this
 * tick), the truck and the store, camera buttons, and the shipment manifest.
 */

import { useEffect, useRef, useState } from "react";

import type { SimStep } from "@/lib/engine/types";
import { World } from "@/lib/engine/world/world";
import { warehouseDomain, warehouseStallReason, type WarehouseDomain, type WarehousePallet } from "@/lib/engine/worlds/warehouse";
import { WarehouseScene, type ProjectedLabels, type TrackSubject, type ViewMode } from "./warehouse/scene";

const INDIGO = "#4f46e5";
const CORAL = "#ff6b4a";
const VOLT = "#c8ff3d";

function motionDuration(animationRate: number): number {
  return Math.max(120, Math.floor(420 / Math.max(1, animationRate)));
}

/** What the Track camera is framing, in the yard's own names. */
function trackLabel(subject: TrackSubject, domain: WarehouseDomain): string {
  if (subject === "forklift") return domain.forkliftId;
  if (subject === "dock") return "Loading bay";
  if (subject === "truck") return domain.truck.id;
  if (subject === "store") return domain.store;
  return "Yard";
}

function truckStatus(domain: WarehouseDomain): string {
  const t = domain.truck;
  if (t.phase === "docked") return `In bay · ${t.load.length}/${t.capacity}`;
  if (t.phase === "outbound") return `To ${domain.store.split(" ")[0]} · ${t.load.length} aboard`;
  if (t.phase === "unloading") return "Unloading";
  return `Returning · ${t.timer} ticks`;
}

function palletStatus(p: WarehousePallet, misShipped: boolean): string {
  if (p.state === "delivered") return misShipped ? "mis-shipped" : "✓ delivered";
  if (p.state === "onTruck") return "on truck";
  if (p.state === "carried") return "on forks";
  return p.held ? "left in yard" : "staged";
}

export function WarehouseRenderer({
  world,
  step,
  animationRate = 1,
}: {
  world: World;
  step?: SimStep;
  animationRate?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<WarehouseScene | null>(null);
  const forkliftLabelRef = useRef<HTMLDivElement>(null);
  const truckLabelRef = useRef<HTMLDivElement>(null);
  const storeLabelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ViewMode>("track");
  const [subject, setSubject] = useState<TrackSubject>("yard");

  // Mount the WebGL scene once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new WarehouseScene(host);
    sceneRef.current = scene;
    scene.pipElement = pipRef.current;
    scene.onSubject = setSubject;
    const labelEls = { forklift: forkliftLabelRef, truck: truckLabelRef, store: storeLabelRef };
    scene.onFrame = (labels: ProjectedLabels, pipVisible: boolean) => {
      if (pipRef.current) pipRef.current.style.opacity = pipVisible ? "1" : "0";
      for (const key of ["forklift", "truck", "store"] as const) {
        const el = labelEls[key].current;
        const p = labels[key];
        if (!el) continue;
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        el.style.opacity = p.visible ? "1" : "0";
      }
    };
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Push every render's world state (one render per tick) into the scene.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setTiming(motionDuration(animationRate), 1000 / Math.max(0.1, animationRate));
    // The action applied this tick tells Track mode what is working.
    scene.sync(world, false, step && step.tick === world.tick ? step.trace.action.type : null);
  });

  const domain = warehouseDomain(world);
  if (!domain) return null;

  const route = domain.pallets.filter((p) => p.forRoute);
  const delivered = route.filter((p) => p.state === "delivered").length;
  const battery =
    world.energyCapacity && world.agent.energy !== null
      ? Math.round((world.agent.energy / world.energyCapacity) * 100)
      : null;
  const carried = domain.pallets.find((p) => p.state === "carried");
  const ruleId = step && step.tick === world.tick ? step.trace.ruleId : null;
  // Visual rules name a function; a Code controller only returns an action.
  const fn = step && step.tick === world.tick ? (ruleId ? step.trace.functionId : null) ?? step.trace.action.type : null;
  const done = world.status === "reached";

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-[#eeede8] shadow-sm dark:border-zinc-800"
        style={{ aspectRatio: "16 / 10", minHeight: 320 }}
      >
        <div ref={hostRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" aria-label="3D warehouse yard" role="img" />

        {/* Live stats */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2 pr-14">
          <Stat label={`Delivered to ${domain.store}`} value={`${delivered}/${route.length}`} bar={(delivered / route.length) * 100} barColor={INDIGO} />
          <Stat label={domain.truck.id} value={truckStatus(domain)} highlight={domain.truck.phase !== "docked"} />
          <Stat label="Mis-ships" value={String(domain.misShips)} alert={domain.misShips > 0} />
          {battery !== null && (
            <Stat label={`Battery · ${domain.forkliftId}`} value={`${battery}%`} bar={battery} barColor={battery > 30 ? INDIGO : CORAL} />
          )}
        </div>

        {/* Why the run stopped, in plain words */}
        {(world.status === "stuck" || world.status === "out-of-energy") && (
          <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center px-3">
            <div className="max-w-md rounded-lg border bg-white/95 px-3 py-2 text-xs shadow-md" style={{ borderColor: CORAL }}>
              <div className="font-semibold" style={{ color: CORAL }}>
                {world.status === "stuck" ? "Yard stalled" : "Forklift battery ran flat"}
              </div>
              <div className="mt-0.5 text-zinc-700">
                {world.status === "stuck"
                  ? warehouseStallReason(world)
                  : "The forklift drove further than its battery allows. Only driving uses battery — look for wasted trips."}
              </div>
            </div>
          </div>
        )}

        {/* Camera controls */}
        <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur">
          <CamButton label="Zoom in" onClick={() => sceneRef.current?.zoom(0.8)}>+</CamButton>
          <CamButton label="Zoom out" onClick={() => sceneRef.current?.zoom(1.25)}>−</CamButton>
          <CamButton label="Rotate left" onClick={() => sceneRef.current?.rotate(-Math.PI / 8)}>⟲</CamButton>
          <CamButton label="Rotate right" onClick={() => sceneRef.current?.rotate(Math.PI / 8)}>⟳</CamButton>
          <CamButton label="Reset view" onClick={() => sceneRef.current?.resetView()}>⌂</CamButton>
          <CamButton
            label="Full screen"
            onClick={() => {
              const el = frameRef.current;
              if (!el) return;
              if (document.fullscreenElement) void document.exitFullscreen();
              else void el.requestFullscreen?.();
            }}
          >
            ⛶
          </CamButton>
        </div>

        {/* View modes */}
        <div className="absolute bottom-8 right-3 flex overflow-hidden rounded-lg border border-zinc-200 bg-white/90 text-[11px] shadow-sm backdrop-blur">
          {(
            [
              ["track", "Track"],
              ["yard", "Yard"],
              ["route", "Route"],
              ["forklift", "Follow forklift"],
              ["truck", "Follow truck"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id);
                sceneRef.current?.setViewMode(id);
              }}
              className="border-r border-zinc-200 px-2 py-1 font-medium last:border-r-0"
              style={mode === id ? { background: "#0f0f13", color: "#fff" } : { color: "#3a3a40" }}
            >
              {id === "track" && mode === "track" ? `Track · ${trackLabel(subject, domain)}` : label}
            </button>
          ))}
        </div>

        {/* Truck cam: the scene renders into this rect while the truck is away */}
        <div
          ref={pipRef}
          className="pointer-events-none absolute bottom-[4.25rem] right-3 w-[34%] min-w-[160px] rounded-lg border-2 transition-opacity"
          style={{ aspectRatio: "16 / 10", borderColor: VOLT, opacity: 0 }}
        >
          <span className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-900" style={{ background: VOLT }}>
            Truck cam · {domain.truck.id}
          </span>
        </div>

        {/* Floating labels, positioned every frame by the scene */}
        <div className="pointer-events-none absolute inset-0">
          <div ref={forkliftLabelRef} className="absolute left-0 top-0 flex flex-col items-center gap-1 transition-opacity">
            {fn && !done && (
              <span className="whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-900 shadow" style={{ background: VOLT }}>
                {ruleId ?? (step?.trace.functionId === "controller" ? "code" : "no rule")} → {fn}
              </span>
            )}
            <span className="mb-1 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-white/95 py-0.5 pl-2 pr-2 text-[11px] shadow-md">
              <span className="font-semibold text-zinc-900">{domain.forkliftId}</span>
              {carried ? (
                <>
                  <Dot color={carried.forRoute ? INDIGO : CORAL} />
                  <span className="text-zinc-600">{carried.id}</span>
                </>
              ) : (
                <span className="text-zinc-500">{done ? "done" : "empty"}</span>
              )}
            </span>
          </div>
          <div ref={truckLabelRef} className="absolute left-0 top-0 transition-opacity">
            <span
              className="mb-1 flex items-center gap-1.5 whitespace-nowrap rounded-full border py-0.5 pl-2 pr-2 text-[11px] shadow-md"
              style={{ background: domain.truck.phase === "docked" ? "rgba(255,255,255,0.95)" : VOLT, borderColor: "#e6e5e1" }}
            >
              <span className="font-semibold text-zinc-900">{domain.truck.id}</span>
              <span className="text-zinc-700">{truckStatus(domain)}</span>
              <span className="flex gap-0.5">
                {Array.from({ length: domain.truck.capacity }).map((_, i) => {
                  const id = domain.truck.load[i];
                  const p = id ? domain.pallets.find((q) => q.id === id) : undefined;
                  return <span key={i} className="h-2 w-2 rounded-[2px] border border-zinc-300" style={{ background: p ? (p.forRoute ? INDIGO : CORAL) : "transparent" }} />;
                })}
              </span>
            </span>
          </div>
          <div ref={storeLabelRef} className="absolute left-0 top-0 transition-opacity">
            <span className="mb-1 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-900 py-0.5 pl-2 pr-2 text-[11px] text-white shadow-md">
              <span className="font-semibold">{domain.store}</span>
              <span style={{ color: VOLT }}>{delivered}/{route.length} received</span>
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-3 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1"><Dot color={INDIGO} /> {domain.store}</span>
          <span className="flex items-center gap-1"><Dot color={CORAL} /> other store</span>
          <span className="hidden text-zinc-500 sm:inline">· drag to pan · right-drag to orbit · pinch or ⌘-scroll to zoom</span>
        </div>
      </div>

      {/* Shipment manifest */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-zinc-600 dark:text-zinc-400">Manifest</span>
        {domain.pallets.map((p) => {
          const misShipped = p.state === "delivered" && !p.forRoute;
          const targeted = p.id === domain.targetId && p.state === "waiting";
          return (
            <span
              key={p.id}
              className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors duration-300"
              style={manifestStyle(p, misShipped, targeted)}
              title={`${p.sku} · for ${p.store}`}
            >
              <Dot color={p.forRoute ? INDIGO : CORAL} faded={p.state === "onTruck" || p.state === "delivered"} />
              <span className="font-mono">{p.id}</span>
              <span className="opacity-70">{palletStatus(p, misShipped)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Dot({ color, faded }: { color: string; faded?: boolean }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color, opacity: faded ? 0.35 : 1 }} />;
}

/**
 * Manifest tag colour follows the pallet's state: plain while staged, volt
 * while on the forks, greyed out once on the truck, and settled once delivered.
 */
function manifestStyle(p: WarehousePallet, misShipped: boolean, targeted: boolean): React.CSSProperties {
  if (misShipped) return { background: "#fff1ee", borderColor: CORAL, color: CORAL };
  if (p.state === "carried") return { background: VOLT, borderColor: "#0f0f13", color: "#0f0f13", fontWeight: 600 };
  if (p.state === "onTruck") return { background: "#efeeea", borderColor: "#e6e5e1", color: "#8a8a92" };
  if (p.state === "delivered") return { background: "#efeeea", borderColor: "#e6e5e1", color: "#56565c" };
  if (p.held) return { background: "#ffffff", borderColor: "#d9d8d3", borderStyle: "dashed", color: "#8a8a92" };
  return { background: "#ffffff", borderColor: targeted ? "#0f0f13" : "#e6e5e1", color: "#3a3a40" };
}

function Stat({
  label,
  value,
  bar,
  barColor,
  highlight,
  alert,
}: {
  label: string;
  value: string;
  bar?: number;
  barColor?: string;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className="min-w-[92px] rounded-lg border border-zinc-200/80 bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur"
      style={highlight ? { background: VOLT, borderColor: VOLT } : alert ? { borderColor: CORAL } : undefined}
    >
      <div className="text-[10px] font-medium text-zinc-500" style={highlight ? { color: "#3a3a40" } : undefined}>{label}</div>
      <div className="text-sm font-semibold tabular-nums text-zinc-900" style={alert ? { color: CORAL } : undefined}>{value}</div>
      {bar !== undefined && (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, bar))}%`, background: barColor }} />
        </div>
      )}
    </div>
  );
}

function CamButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center border-b border-zinc-200 text-base text-zinc-700 last:border-b-0 hover:bg-zinc-100"
    >
      {children}
    </button>
  );
}
