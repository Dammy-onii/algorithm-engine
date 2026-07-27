"use client";

/**
 * Finance board — payment routing has no grid, so this renders the actual
 * decision surface: the payment at the head of the queue, each provider's live
 * health, and the running cost/outcome tally. Monochrome, consistent with the
 * rest of the studio. All domain queries stay in the finance module.
 */

import { World } from "@/lib/engine/world/world";
import {
  ProviderState,
  canRoute,
  countByStatus,
  currentTx,
  expectedCost,
  financeScore,
  financeRuntime,
  providerStateAt,
  readyTransactions,
  totalCost,
} from "@/lib/engine/worlds/finance";

const NAIRA_AMOUNT = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const NAIRA_COST = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SCORE = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function FinanceRenderer({ world }: { world: World }) {
  const runtime = financeRuntime(world);
  if (!runtime) return null;

  const tx = currentTx(world);
  const penalty = runtime.failurePenalty;
  const states = runtime.providers
    .map((p) => providerStateAt(runtime, p.id, world.tick))
    .filter((s): s is ProviderState => s !== null);

  const waiting = countByStatus(world, "waiting");
  const succeeded = countByStatus(world, "succeeded");
  const failed = countByStatus(world, "failed");
  const declined = countByStatus(world, "declined");
  const lost = countByStatus(world, "lost");
  const scheduled = countByStatus(world, "scheduled");
  const inFlight = countByStatus(world, "processing");
  const timedOut = runtime.timedOut;
  const queued = readyTransactions(world);
  const settled = runtime.transactions.filter((item) =>
    ["succeeded", "failed", "declined", "lost"].includes(item.status),
  );
  const latestSettlement = [...settled].sort(
    (left, right) => (left.completedAt ?? -1) - (right.completedAt ?? -1),
  ).at(-1);
  const hasExceptions = failed + declined + lost > 0;
  const decision = runtime.lastDecision;

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Operational transfer flow — intentionally lanes and queues, never a grid. */}
      <section className="finance-flow-container rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Transfer flow</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Queue → AI routing decision → provider lane</p>
          </div>
          <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
            Tick {world.tick}
          </span>
        </div>

        <div className="finance-flow-track">
          <FlowPanel title={`Ready queue · ${queued.length}`}>
            {queued.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {queued.slice(0, 5).map((item, index) => (
                  <span
                    key={item.id}
                    className={[
                      "rounded border px-1.5 py-1 font-mono text-[10px] tabular-nums",
                      index === 0
                        ? "border-zinc-900 bg-zinc-900 text-white motion-safe:animate-pulse dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                    ].join(" ")}
                  >
                    {item.id} · {NAIRA_AMOUNT.format(item.amount)}
                  </span>
                ))}
                {queued.length > 5 && <span className="self-center text-[10px] text-zinc-400">+{queued.length - 5}</span>}
              </div>
            ) : (
              <EmptyFlow
                label={
                  inFlight > 0
                    ? `${inFlight} transfer${inFlight === 1 ? "" : "s"} processing`
                    : scheduled > 0
                      ? `${scheduled} scheduled arrival${scheduled === 1 ? "" : "s"} pending`
                      : hasExceptions
                        ? "Queue closed with exceptions"
                        : "No transfers waiting"
                }
              />
            )}
          </FlowPanel>

          <FlowArrow label="decide" />

          <FlowPanel title="AI router">
            <div className="rounded border border-zinc-900 bg-white p-2 dark:border-zinc-100 dark:bg-zinc-900">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Live policy</p>
              <p className="mt-1 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                {tx
                  ? `Choosing a route for ${tx.id}`
                  : inFlight > 0
                    ? "Monitoring provider processing"
                    : hasExceptions
                      ? "Run ended with exceptions"
                      : "All transfers completed"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-zinc-500">
                {decision
                  ? formatDecision(decision)
                  : latestSettlement
                    ? `${latestSettlement.id} → ${latestSettlement.status}`
                  : "Awaiting first decision"}
              </p>
            </div>
          </FlowPanel>

          <FlowArrow label="route" />

          <FlowPanel title="Provider lanes" className="min-w-0">
            <div className="flex flex-col gap-1.5">
              {states.map((state) => {
                const justUsed =
                  decision?.action === "route" &&
                  decision.providerId === state.id &&
                  decision.tick === world.tick - 1;
                const laneStatus = providerLaneStatus(state);
                return (
                  <div
                    key={state.id}
                    className={[
                      "flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs",
                      justUsed
                        ? "border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-300 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-100 dark:ring-blue-500/30"
                        : laneStatus === "available"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100"
                          : laneStatus === "busy"
                            ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-100"
                            : "border-red-300 bg-red-50 text-red-950 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-100",
                    ].join(" ")}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <StatusDot status={laneStatus} />
                        {state.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[9px] opacity-70">
                        {state.successRate.toFixed(1)}% success ·{" "}
                        {Math.round(state.latency)}ms
                      </span>
                    </span>
                    <span className="shrink-0 text-right font-mono text-[10px]">
                      <span className="block font-semibold uppercase">
                        {laneStatus}
                      </span>
                      <span className="block opacity-70">
                        {runtime.processingMode === "queued"
                          ? `${state.active} active · ${state.capacityRemaining} free`
                          : `${state.handled} routed`}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </FlowPanel>

        </div>
      </section>

      {/* Current payment */}
      <div className="rounded-md bg-zinc-900 p-3 text-white dark:bg-zinc-100 dark:text-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {tx ? "Ready for decision" : "Queue status"}
          </span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {waiting} waiting
          </span>
        </div>
        {tx ? (
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold tabular-nums">{NAIRA_AMOUNT.format(tx.amount)}</span>
            <span className="text-xs text-zinc-300 dark:text-zinc-600">
              {tx.id}
              {tx.type ? ` · ${tx.type}` : ""}
              {tx.destination ? ` → ${tx.destination}` : ""}
            </span>
          </div>
        ) : (
          <div
            className={[
              "mt-0.5 text-sm font-medium",
              hasExceptions ? "text-red-200 dark:text-red-700" : "",
            ].join(" ")}
          >
            {inFlight > 0
              ? "Waiting for provider completion"
              : scheduled > 0
                ? "Waiting for scheduled arrivals"
                : hasExceptions
                  ? "Queue closed with failed, declined, or timed-out transfers"
                  : "All transfers completed successfully"}
          </div>
        )}
      </div>

      {/* Providers */}
      <div className="flex flex-col gap-2">
        {states.map((s) => {
          const usable = canRoute(world, s.id);
          const exp = expectedCost(s, penalty);
          const laneStatus = providerLaneStatus(s);
          return (
            <div
              key={s.id}
              className={[
                "rounded-md border px-3 py-2",
                laneStatus === "available"
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/5"
                  : laneStatus === "busy"
                    ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5"
                    : "border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/5",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.name}</span>
                  <span
                    className={[
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      laneStatus === "available"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : laneStatus === "busy"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                          : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
                    ].join(" ")}
                  >
                    {laneStatus}
                  </span>
                </div>
                <span className="font-mono text-xs text-zinc-500">{s.id}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500 tabular-nums">
                <span>fee {NAIRA_COST.format(s.fee)}</span>
                <span>success {s.successRate.toFixed(1)}%</span>
                <span>latency {Math.round(s.latency)}ms</span>
                {runtime.processingMode === "queued" && (
                  <>
                    <span>capacity {s.capacityRemaining} free</span>
                    <span>active {s.active}</span>
                    <span>health {s.healthScore.toFixed(1)}%</span>
                  </>
                )}
                {!usable && s.online && s.capacityRemaining > 0 && (
                  <span className="font-medium text-amber-700 dark:text-amber-300">
                    incompatible with current transfer
                  </span>
                )}
                {penalty > 0 && <span>exp. cost {NAIRA_COST.format(exp)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Running tally */}
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2 text-xs tabular-nums dark:border-zinc-800">
        <MetricChip label="waiting" value={waiting} tone="neutral" />
        {runtime.processingMode === "queued" && (
          <MetricChip label="in flight" value={inFlight} tone="info" />
        )}
        <MetricChip label="succeeded" value={succeeded} tone="success" />
        <MetricChip label="failed" value={failed} tone="danger" />
        {declined > 0 && <MetricChip label="declined" value={declined} tone="warning" />}
        {runtime.processingMode === "queued" && (
          <MetricChip label="timed out" value={timedOut} tone="danger" />
        )}
        <span
          className={[
            "ml-auto rounded-md px-2 py-1 text-right font-semibold",
            hasExceptions
              ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
          ].join(" ")}
          title={runtime.processingMode === "queued" ? "Lower is better" : undefined}
        >
          {runtime.processingMode === "queued"
            ? `penalty score ${SCORE.format(financeScore(world))} · lower is better`
            : `total cost ${NAIRA_COST.format(totalCost(world))}`}
        </span>
      </div>
    </div>
  );
}

function FlowPanel({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
      {children}
    </div>
  );
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="finance-flow-arrow">
      <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      <span className="finance-flow-arrow-symbol">→</span>
    </div>
  );
}

function EmptyFlow({ label }: { label: string }) {
  return <p className="py-1 text-[10px] text-zinc-400">{label}</p>;
}

type LaneStatus = "available" | "busy" | "offline";

function providerLaneStatus(state: ProviderState): LaneStatus {
  if (!state.online) return "offline";
  if (state.capacityRemaining <= 0) return "busy";
  return "available";
}

function StatusDot({ status }: { status: LaneStatus }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "h-1.5 w-1.5 shrink-0 rounded-full",
        status === "available"
          ? "bg-emerald-500"
          : status === "busy"
            ? "bg-amber-500"
            : "bg-red-500",
      ].join(" ")}
    />
  );
}

function formatDecision(decision: {
  tick: number;
  transactionId: string;
  action: "route" | "hold" | "decline";
  providerId?: string;
  outcome: string;
}) {
  if (decision.action === "route") {
    return `${decision.transactionId} → ${decision.providerId} · ${decision.outcome}`;
  }
  return `${decision.transactionId} → ${decision.action} · tick ${decision.tick}`;
}

function MetricChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "danger" | "warning" | "info";
}) {
  const toneClass = {
    neutral:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  }[tone];

  return (
    <span className={`rounded-md px-2 py-1 font-medium ${toneClass}`}>
      {label} {value}
    </span>
  );
}
