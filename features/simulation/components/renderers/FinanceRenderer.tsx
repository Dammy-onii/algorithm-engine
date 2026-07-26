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
  const inFlight = countByStatus(world, "processing");
  const timedOut = runtime.timedOut;
  const total = runtime.transactions.length;
  const queued = readyTransactions(world);
  const settled = runtime.transactions.filter((item) =>
    ["succeeded", "failed", "declined", "lost"].includes(item.status),
  );
  const latestSettlement = settled.at(-1);

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
          <FlowPanel title={`Incoming queue · ${waiting}`}>
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
            ) : <EmptyFlow label="No transfers waiting" />}
          </FlowPanel>

          <FlowArrow label="decide" />

          <FlowPanel title="AI router">
            <div className="rounded border border-zinc-900 bg-white p-2 dark:border-zinc-100 dark:bg-zinc-900">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Live policy</p>
              <p className="mt-1 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                {tx ? `Choosing a route for ${tx.id}` : "Queue complete"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-zinc-500">
                {latestSettlement
                  ? `${latestSettlement.id} → ${latestSettlement.routedTo ?? "held"}`
                  : "Awaiting first decision"}
              </p>
            </div>
          </FlowPanel>

          <FlowArrow label="route" />

          <FlowPanel title="Provider lanes" className="min-w-0">
            <div className="flex flex-col gap-1.5">
              {states.map((state) => {
                const justUsed = latestSettlement?.routedTo === state.id;
                return (
                  <div
                    key={state.id}
                    className={[
                      "flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs",
                      justUsed
                        ? "border-zinc-900 bg-zinc-900 text-white motion-safe:animate-pulse dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : state.online
                          ? "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          : "border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900",
                    ].join(" ")}
                  >
                    <span className="font-semibold">{state.name}</span>
                    <span className="font-mono text-[10px] opacity-75">
                      {state.online
                        ? runtime.processingMode === "queued"
                          ? `${state.active} active · ${state.capacityRemaining} free`
                          : `${state.handled} routed`
                        : "offline"}
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
            {tx ? "Now processing" : "Queue"}
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
          <div className="mt-0.5 text-sm font-medium">Queue cleared</div>
        )}
      </div>

      {/* Providers */}
      <div className="flex flex-col gap-2">
        {states.map((s) => {
          const usable = canRoute(world, s.id);
          const exp = expectedCost(s, penalty);
          return (
            <div
              key={s.id}
              className={[
                "rounded-md border px-3 py-2",
                usable
                  ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60"
                  : "border-zinc-200 bg-white opacity-60 dark:border-zinc-800 dark:bg-zinc-900",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.name}</span>
                  <span
                    className={[
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      s.online
                        ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                        : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
                    ].join(" ")}
                  >
                    {s.online ? "online" : "offline"}
                  </span>
                </div>
                <span className="font-mono text-xs text-zinc-500">{s.id}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500 tabular-nums">
                <span>fee {NAIRA_COST.format(s.fee)}</span>
                <span>success {s.successRate}%</span>
                <span>latency {s.latency}ms</span>
                {runtime.processingMode === "queued" && (
                  <>
                    <span>capacity {s.capacityRemaining} free</span>
                    <span>health {s.healthScore.toFixed(0)}</span>
                  </>
                )}
                {penalty > 0 && <span>exp. cost {NAIRA_COST.format(exp)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Running tally */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-500 tabular-nums dark:border-zinc-800">
        <span>processed {succeeded + failed + countByStatus(world, "declined") + countByStatus(world, "lost")}/{total}</span>
        {runtime.processingMode === "queued" && <span>in flight {inFlight}</span>}
        <span className="text-zinc-900 dark:text-zinc-100">✓ {succeeded}</span>
        <span>✗ {failed}</span>
        {runtime.processingMode === "queued" && <span>timeouts {timedOut}</span>}
        <span className="ml-auto font-semibold text-zinc-700 dark:text-zinc-300">
          {runtime.processingMode === "queued"
            ? `score ${financeScore(world).toFixed(2)}`
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
