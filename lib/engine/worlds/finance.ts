/**
 * Finance world module — Payment Routing.
 *
 * The player is not building a bank app; they are authoring the *decision layer*
 * inside payment infrastructure. Each tick the engine presents the head of a
 * transaction queue plus the live state of several payment providers, and the
 * brain chooses how to execute that one payment: route it through a provider,
 * hold it, or decline it. The module resolves the outcome (success/failure via a
 * seeded, reproducible draw against the provider's reliability), books the cost,
 * and advances the queue.
 *
 * Design choices (see docs/FINANCE_SIMULATION.md):
 *   - Ticks are kept as the universal step counter (one routing decision = one
 *     tick), and money/quality metrics (total cost, failures, lost) are layered
 *     on top — never a replacement for ticks.
 *   - Outcomes are deterministic for a given seed, so a brain grades identically
 *     every run. This is what makes the stage fair to use in interviews.
 *   - No grid semantics are used; a finance world carries a placeholder 1×1 grid
 *     so it satisfies the shared World contract, and ships its own renderer.
 *
 * Grounded in real payment-engineering practice: provider health checks and
 * failover, expected-cost routing (fee + expected failure cost), and — reserved
 * for later grades — idempotent retries with backoff.
 */

import type { Action, SimStatus, WorldData } from "../types";
import type { World } from "../world/world";
import type { DomainFlagSpec, WorldModule } from "./module";

// ---------------------------------------------------------------------------
// Data schema — owned by this module, not the shared engine types.
// ---------------------------------------------------------------------------

/** A scheduled, deterministic change to a provider's health at a given tick. */
export interface FinanceProviderEvent {
  atTick: number;
  online?: boolean;
  fee?: number;
  successRate?: number;
  latency?: number;
  concurrentCapacity?: number;
}

export interface FinanceProvider {
  /** Short id; the routing action `routeTo<Id>` targets it (A, B, C). */
  id: string;
  name: string;
  /** Flat fee charged per routing attempt, in Nigerian naira. */
  fee: number;
  /** Reliability as a percentage 0–100. */
  successRate: number;
  /** Round-trip latency in milliseconds. */
  latency: number;
  online: boolean;
  /** Max attempts this provider can take in a run. Omit for unlimited. */
  capacity?: number;
  /** Simultaneous in-flight payments in orchestration mode. */
  concurrentCapacity?: number;
  /** Extra latency added for every payment already being processed. */
  congestionLatencyPerItem?: number;
  /** Transaction types it can process. Omit to accept all. */
  accepts?: string[];
  /** Largest payment this provider accepts. Omit for no limit. */
  maxAmount?: number;
  /** Deterministic health changes over time. */
  schedule?: FinanceProviderEvent[];
}

export interface FinanceTransaction {
  id: string;
  amount: number;
  /** "consumer" | "business" | "international" (free-form). */
  type?: string;
  destination?: string;
  /** Tick at which the payment enters the ready queue. Defaults to 0. */
  arrivalTick?: number;
  /** 0 = normal, 1 = elevated, 2 = urgent, 3 = critical. */
  priority?: number;
  /** Ticks from arrival until the payment expires. */
  deadlineTicks?: number;
  /** Number of additional attempts permitted after the first failure. */
  maxRetries?: number;
  /** Penalty weight used when this payment misses its service level. */
  customerImpact?: number;
}

export interface FinanceTransactionBatch {
  prefix: string;
  count: number;
  arrivalStart?: number;
  arrivalEvery?: number;
  amounts: number[];
  types?: string[];
  destinations?: string[];
  priorityEvery?: number;
  priority?: number;
  deadlineTicks?: number;
  maxRetries?: number;
  customerImpact?: number;
}

export interface FinanceConfig {
  /** Seed for the reproducible success/failure draw. Defaults to 1. */
  seed?: number;
  providers: FinanceProvider[];
  transactions?: FinanceTransaction[];
  /** Compact deterministic generator for interview-scale visible/hidden loads. */
  batches?: FinanceTransactionBatch[];
  /** Instant preserves tutorials; queued models real processing over time. */
  processingMode?: "instant" | "queued";
  /** Duration represented by one simulation tick. Defaults to 1000 ms. */
  tickDurationMs?: number;
  /** Delay before a failed payment becomes eligible for another route. */
  retryBackoffTicks?: number;
  /** Support cost booked when a payment fails. Defaults to 0. */
  failurePenalty?: number;
  timeoutPenalty?: number;
  priorityFailurePenalty?: number;
  overloadPenalty?: number;
  queuePenaltyPerTick?: number;
  /** amount ≥ this ⇒ isHighValue. Defaults to 10000. */
  highValueThreshold?: number;
  /** Ticks a transaction may wait before it is lost. 0 = never. */
  expireAfter?: number;
  /** Safety cap = transactions × this. Defaults to 30. */
  maxTicksPerTx?: number;
}

type FinanceWorldData = WorldData & { finance?: FinanceConfig };

function financeConfig(data: WorldData): FinanceConfig | undefined {
  return (data as FinanceWorldData).finance;
}

// The three provider slots the observation vocabulary exposes by name.
const SLOTS = ["A", "B", "C"] as const;
type Slot = (typeof SLOTS)[number];
const ROUTE_ACTION: Record<string, Slot> = { routeToA: "A", routeToB: "B", routeToC: "C" };

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateFinanceData(data: WorldData): void {
  const config = financeConfig(data);
  if (!config) throw new Error("[finance] world is missing finance configuration");
  if (!Array.isArray(config.providers) || config.providers.length === 0) {
    throw new Error("[finance] at least one provider is required");
  }
  if (
    (!Array.isArray(config.transactions) || config.transactions.length === 0) &&
    (!Array.isArray(config.batches) || config.batches.length === 0)
  ) {
    throw new Error("[finance] at least one transaction or generated batch is required");
  }
  const ids = new Set<string>();
  for (const p of config.providers) {
    if (!p.id) throw new Error("[finance] a provider has an empty id");
    if (ids.has(p.id)) throw new Error(`[finance] duplicate provider '${p.id}'`);
    if (!SLOTS.includes(p.id as Slot)) {
      throw new Error(`[finance] provider id '${p.id}' must be one of A, B, C`);
    }
    if (p.successRate < 0 || p.successRate > 100) {
      throw new Error(`[finance] provider '${p.id}' successRate must be 0–100`);
    }
    if ((p.concurrentCapacity ?? 1) < 1) {
      throw new Error(`[finance] provider '${p.id}' concurrentCapacity must be at least 1`);
    }
    ids.add(p.id);
  }
  const txIds = new Set<string>();
  for (const batch of config.batches ?? []) {
    if (!batch.prefix || batch.count < 1 || batch.amounts.length < 1) {
      throw new Error("[finance] each generated batch needs a prefix, count, and amounts");
    }
  }
  for (const t of expandTransactions(config)) {
    if (!t.id) throw new Error("[finance] a transaction has an empty id");
    if (txIds.has(t.id)) throw new Error(`[finance] duplicate transaction '${t.id}'`);
    if (typeof t.amount !== "number" || t.amount < 0) {
      throw new Error(`[finance] transaction '${t.id}' needs a non-negative amount`);
    }
    if ((t.arrivalTick ?? 0) < 0 || (t.deadlineTicks ?? 0) < 0) {
      throw new Error(`[finance] transaction '${t.id}' has a negative arrival or deadline`);
    }
    txIds.add(t.id);
  }
}

// ---------------------------------------------------------------------------
// Runtime (mutable; never mutate the source JSON)
// ---------------------------------------------------------------------------

export type TxStatus =
  | "scheduled"
  | "waiting"
  | "processing"
  | "succeeded"
  | "failed"
  | "declined"
  | "lost";

export interface FinanceRuntimeTx extends FinanceTransaction {
  status: TxStatus;
  /** Provider the payment was routed through, once finalized. */
  routedTo?: string;
  /** Ticks spent waiting in the queue. */
  waited: number;
  attempts: number;
  failedAttempts: number;
  nextEligibleTick: number;
  startedAt?: number;
  completedAt?: number;
  completesAt?: number;
  lastProvider?: string;
}

export interface FinanceProviderTelemetry {
  attempts: number;
  completed: number;
  succeeded: number;
  failed: number;
  totalLatencyMs: number;
  /** Bounded so the displayed reliability stays responsive during long runs. */
  recentOutcomes: boolean[];
}

export interface FinanceRuntime {
  providers: FinanceProvider[];
  providerTelemetry: Record<string, FinanceProviderTelemetry>;
  transactions: FinanceRuntimeTx[];
  totalCost: number;
  processingCost: number;
  failedAttempts: number;
  timedOut: number;
  priorityFailures: number;
  overloadRejects: number;
  queueArea: number;
  failurePenalty: number;
  timeoutPenalty: number;
  priorityFailurePenalty: number;
  overloadPenalty: number;
  queuePenaltyPerTick: number;
  highValueThreshold: number;
  expireAfter: number;
  processingMode: "instant" | "queued";
  tickDurationMs: number;
  retryBackoffTicks: number;
  maxTicks: number;
  /** Most recent policy decision, including non-terminal hold actions. */
  lastDecision?: {
    tick: number;
    transactionId: string;
    action: "route" | "hold" | "decline";
    providerId?: string;
    outcome: TxStatus | "held";
  };
  /** LCG state for reproducible outcome draws. */
  rng: number;
}

function expandTransactions(config: FinanceConfig): FinanceTransaction[] {
  const explicit = structuredClone(config.transactions ?? []);
  const generated = (config.batches ?? []).flatMap((batch) =>
    Array.from({ length: batch.count }, (_, index): FinanceTransaction => ({
      id: `${batch.prefix}-${String(index + 1).padStart(4, "0")}`,
      amount: batch.amounts[index % batch.amounts.length] ?? 0,
      type: batch.types?.[index % batch.types.length],
      destination: batch.destinations?.[index % batch.destinations.length],
      arrivalTick:
        (batch.arrivalStart ?? 0) + index * (batch.arrivalEvery ?? 0),
      priority:
        batch.priorityEvery && (index + 1) % batch.priorityEvery === 0
          ? batch.priority ?? 2
          : 0,
      deadlineTicks: batch.deadlineTicks,
      maxRetries: batch.maxRetries,
      customerImpact: batch.customerImpact,
    })),
  );
  return [...explicit, ...generated];
}

export function createFinanceRuntime(data: WorldData): FinanceRuntime | null {
  const config = financeConfig(data);
  if (data.kind !== "finance" || !config) return null;

  const maxPerTx = config.maxTicksPerTx ?? 30;
  const transactions = expandTransactions(config);
  return {
    providers: structuredClone(config.providers),
    providerTelemetry: Object.fromEntries(
      config.providers.map((provider) => [
        provider.id,
        {
          attempts: 0,
          completed: 0,
          succeeded: 0,
          failed: 0,
          totalLatencyMs: 0,
          recentOutcomes: [],
        },
      ]),
    ),
    transactions: transactions.map((t) => ({
      ...structuredClone(t),
      status: (t.arrivalTick ?? 0) > 0 ? "scheduled" as const : "waiting" as const,
      waited: 0,
      attempts: 0,
      failedAttempts: 0,
      nextEligibleTick: t.arrivalTick ?? 0,
    })),
    totalCost: 0,
    processingCost: 0,
    failedAttempts: 0,
    timedOut: 0,
    priorityFailures: 0,
    overloadRejects: 0,
    queueArea: 0,
    failurePenalty: config.failurePenalty ?? 0,
    timeoutPenalty: config.timeoutPenalty ?? config.failurePenalty ?? 0,
    priorityFailurePenalty: config.priorityFailurePenalty ?? 0,
    overloadPenalty: config.overloadPenalty ?? 0,
    queuePenaltyPerTick: config.queuePenaltyPerTick ?? 0,
    highValueThreshold: config.highValueThreshold ?? 10000,
    expireAfter: config.expireAfter ?? 0,
    processingMode: config.processingMode ?? "instant",
    tickDurationMs: config.tickDurationMs ?? 1000,
    retryBackoffTicks: config.retryBackoffTicks ?? 1,
    maxTicks: transactions.length * maxPerTx + 50,
    rng: (config.seed ?? 1) >>> 0,
  };
}

// ---------------------------------------------------------------------------
// Queries (pure over runtime)
// ---------------------------------------------------------------------------

export function financeRuntime(world: World): FinanceRuntime | null {
  return (world.domain as FinanceRuntime | null) ?? null;
}

/** The transaction currently at the head of the queue (first still waiting). */
export function readyTransactions(world: World): FinanceRuntimeTx[] {
  return (financeRuntime(world)?.transactions ?? [])
    .filter((tx) => tx.status === "waiting" && tx.nextEligibleTick <= world.tick)
    .sort((left, right) => {
      const priority = (right.priority ?? 0) - (left.priority ?? 0);
      if (priority !== 0) return priority;
      const leftDeadline =
        left.deadlineTicks && left.deadlineTicks > 0
          ? (left.arrivalTick ?? 0) + left.deadlineTicks
          : Infinity;
      const rightDeadline =
        right.deadlineTicks && right.deadlineTicks > 0
          ? (right.arrivalTick ?? 0) + right.deadlineTicks
          : Infinity;
      if (leftDeadline !== rightDeadline) return leftDeadline - rightDeadline;
      return (left.arrivalTick ?? 0) - (right.arrivalTick ?? 0);
    });
}

export function currentTx(world: World): FinanceRuntimeTx | null {
  return readyTransactions(world)[0] ?? null;
}

export interface ProviderState {
  id: string;
  name: string;
  fee: number;
  successRate: number;
  latency: number;
  online: boolean;
  handled: number;
  capacity: number;
  active: number;
  capacityRemaining: number;
  congestion: number;
  utilization: number;
  attempts: number;
  completed: number;
  succeeded: number;
  failed: number;
  observedSuccessRate: number;
  averageLatency: number;
  healthScore: number;
}

/** A provider's *effective* health at the current tick (base + schedule). */
export function providerStateAt(
  runtime: FinanceRuntime,
  id: string,
  tick: number,
): ProviderState | null {
  const p = runtime.providers.find((x) => x.id === id);
  if (!p) return null;
  let online = p.online;
  let fee = p.fee;
  let successRate = p.successRate;
  let latency = p.latency;
  let concurrentCapacity = p.concurrentCapacity ?? 1;
  for (const ev of [...(p.schedule ?? [])].sort((a, b) => a.atTick - b.atTick)) {
    if (ev.atTick <= tick) {
      if (ev.online !== undefined) online = ev.online;
      if (ev.fee !== undefined) fee = ev.fee;
      if (ev.successRate !== undefined) successRate = ev.successRate;
      if (ev.latency !== undefined) latency = ev.latency;
      if (ev.concurrentCapacity !== undefined) {
        concurrentCapacity = ev.concurrentCapacity;
      }
    }
  }
  const handled = runtime.transactions.filter((t) => t.routedTo === id).length;
  const active = runtime.transactions.filter(
    (t) => t.status === "processing" && t.routedTo === id,
  ).length;
  const congestion = concurrentCapacity > 0 ? active / concurrentCapacity : 1;
  const effectiveLatency =
    latency + active * (p.congestionLatencyPerItem ?? 0);
  const telemetry = runtime.providerTelemetry[id] ?? {
    attempts: 0,
    completed: 0,
    succeeded: 0,
    failed: 0,
    totalLatencyMs: 0,
    recentOutcomes: [],
  };
  const observedSuccessRate = telemetry.recentOutcomes.length > 0
    ? telemetry.recentOutcomes.filter(Boolean).length /
      telemetry.recentOutcomes.length *
      100
    : successRate;
  return {
    id: p.id,
    name: p.name,
    fee,
    successRate,
    latency: effectiveLatency,
    online,
    handled,
    capacity: p.capacity ?? Infinity,
    active,
    capacityRemaining:
      runtime.processingMode === "queued"
        ? Math.max(0, concurrentCapacity - active)
        : Math.max(0, (p.capacity ?? Infinity) - handled),
    congestion,
    utilization:
      runtime.processingMode === "queued"
        ? Math.max(0, Math.min(100, congestion * 100))
        : p.capacity === undefined
          ? 0
          : Math.max(0, Math.min(100, handled / p.capacity * 100)),
    attempts: telemetry.attempts,
    completed: telemetry.completed,
    succeeded: telemetry.succeeded,
    failed: telemetry.failed,
    observedSuccessRate,
    averageLatency:
      telemetry.completed > 0
        ? telemetry.totalLatencyMs / telemetry.completed
        : effectiveLatency,
    healthScore: Math.max(
      0,
      Math.min(
        100,
        observedSuccessRate - effectiveLatency / 100 - congestion * 10,
      ),
    ),
  };
}

export function expectedCost(state: ProviderState, penalty: number): number {
  return state.fee + (1 - state.successRate / 100) * penalty;
}

/** Whether a provider can accept the current transaction right now. */
export function canRoute(world: World, id: string): boolean {
  const runtime = financeRuntime(world);
  const tx = currentTx(world);
  if (!runtime || !tx) return false;
  const state = providerStateAt(runtime, id, world.tick);
  if (!state || !state.online) return false;
  if (
    runtime.processingMode === "queued"
      ? state.capacityRemaining <= 0
      : state.handled >= state.capacity
  ) return false;
  const provider = runtime.providers.find((p) => p.id === id);
  if (provider?.accepts && tx.type && !provider.accepts.includes(tx.type)) return false;
  if (provider?.maxAmount !== undefined && tx.amount > provider.maxAmount) return false;
  return true;
}

export function countByStatus(world: World, status: TxStatus): number {
  return financeRuntime(world)?.transactions.filter((t) => t.status === status).length ?? 0;
}

export function processedCount(world: World): number {
  return financeRuntime(world)?.transactions.filter((t) =>
    ["succeeded", "failed", "declined", "lost"].includes(t.status)
  ).length ?? 0;
}

export function allProcessed(world: World): boolean {
  const runtime = financeRuntime(world);
  return !!runtime && runtime.transactions.every((t) =>
    ["succeeded", "failed", "declined", "lost"].includes(t.status)
  );
}

export function totalCost(world: World): number {
  return financeRuntime(world)?.totalCost ?? 0;
}

export function financeScore(world: World): number {
  const runtime = financeRuntime(world);
  if (!runtime) return 0;
  return (
    runtime.totalCost +
    runtime.timedOut * runtime.timeoutPenalty +
    runtime.priorityFailures * runtime.priorityFailurePenalty +
    runtime.overloadRejects * runtime.overloadPenalty +
    runtime.queueArea * runtime.queuePenaltyPerTick
  );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function randomPercent(runtime: FinanceRuntime): number {
  runtime.rng = (Math.imul(runtime.rng, 1664525) + 1013904223) >>> 0;
  return (runtime.rng / 0x100000000) * 100;
}

function beginProviderAttempt(runtime: FinanceRuntime, providerId: string): void {
  const telemetry = runtime.providerTelemetry[providerId];
  if (telemetry) telemetry.attempts += 1;
}

function completeProviderAttempt(
  runtime: FinanceRuntime,
  providerId: string,
  succeeded: boolean,
  latencyMs: number,
): void {
  const telemetry = runtime.providerTelemetry[providerId];
  if (!telemetry) return;

  telemetry.completed += 1;
  telemetry.succeeded += succeeded ? 1 : 0;
  telemetry.failed += succeeded ? 0 : 1;
  telemetry.totalLatencyMs += Math.max(0, latencyMs);
  telemetry.recentOutcomes.push(succeeded);
  if (telemetry.recentOutcomes.length > 20) {
    telemetry.recentOutcomes.shift();
  }
}

function isPriority(tx: FinanceRuntimeTx): boolean {
  return (tx.priority ?? 0) >= 2;
}

function canRetry(tx: FinanceRuntimeTx, world: World): boolean {
  const deadline = tx.deadlineTicks ?? 0;
  const withinDeadline =
    deadline <= 0 || world.tick < (tx.arrivalTick ?? 0) + deadline;
  return tx.failedAttempts <= (tx.maxRetries ?? 0) && withinDeadline;
}

function failAttempt(
  world: World,
  tx: FinanceRuntimeTx,
  options: { overload?: boolean } = {},
): void {
  const runtime = financeRuntime(world)!;
  tx.failedAttempts += 1;
  runtime.failedAttempts += 1;
  runtime.totalCost += runtime.failurePenalty;
  if (options.overload) runtime.overloadRejects += 1;

  if (runtime.processingMode === "queued" && canRetry(tx, world)) {
    tx.status = "waiting";
    tx.nextEligibleTick = world.tick + runtime.retryBackoffTicks;
    tx.completesAt = undefined;
    return;
  }

  tx.status = "failed";
  tx.completedAt = world.tick;
  if (isPriority(tx)) runtime.priorityFailures += 1;
}

function route(world: World, slot: Slot): void {
  const runtime = financeRuntime(world)!;
  const tx = currentTx(world);
  if (!tx) return;
  const state = providerStateAt(runtime, slot, world.tick);
  tx.attempts += 1;
  tx.lastProvider = tx.routedTo;
  tx.routedTo = slot;
  beginProviderAttempt(runtime, slot);

  // Booking the fee models paying the provider to attempt the payment.
  const fee = state?.fee ?? 0;
  runtime.processingCost += fee;
  runtime.totalCost += fee;

  // Routing to an unavailable provider (offline / over capacity / wrong type)
  // fails the payment — this is what the "check the provider first" lessons teach.
  if (!canRoute(world, slot)) {
    completeProviderAttempt(runtime, slot, false, 0);
    failAttempt(world, tx, {
      overload: !!state?.online && state.capacityRemaining <= 0,
    });
    return;
  }

  if (runtime.processingMode === "queued") {
    tx.status = "processing";
    tx.startedAt = world.tick;
    tx.completesAt =
      world.tick + Math.max(1, Math.ceil((state?.latency ?? 0) / runtime.tickDurationMs));
    return;
  }

  // Reproducible success draw: LCG advance → [0,100).
  const roll = randomPercent(runtime);
  if (roll < (state?.successRate ?? 0)) {
    completeProviderAttempt(runtime, slot, true, state?.latency ?? 0);
    tx.status = "succeeded";
    tx.completedAt = world.tick;
  } else {
    completeProviderAttempt(runtime, slot, false, state?.latency ?? 0);
    failAttempt(world, tx);
  }
}

function applyFinanceAction(world: World, action: Action): boolean {
  const runtime = financeRuntime(world);
  if (!runtime) return false;

  const slot = ROUTE_ACTION[action.type];
  if (slot) {
    const tx = currentTx(world);
    route(world, slot);
    if (tx) {
      runtime.lastDecision = {
        tick: world.tick,
        transactionId: tx.id,
        action: "route",
        providerId: slot,
        outcome: tx.status,
      };
    }
    return true;
  }
  if (action.type === "decline") {
    const tx = currentTx(world);
    if (tx) {
      tx.status = "declined";
      tx.completedAt = world.tick;
      if (isPriority(tx)) runtime.priorityFailures += 1;
      runtime.lastDecision = {
        tick: world.tick,
        transactionId: tx.id,
        action: "decline",
        outcome: "declined",
      };
    }
    return true;
  }
  if (action.type === "hold") {
    const tx = currentTx(world);
    if (tx) {
      runtime.lastDecision = {
        tick: world.tick,
        transactionId: tx.id,
        action: "hold",
        outcome: "held",
      };
      if (runtime.processingMode === "instant") {
        tx.waited += 1;
        if (runtime.expireAfter > 0 && tx.waited > runtime.expireAfter) {
          tx.status = "lost";
        }
      }
    }
    return true;
  }
  return false;
}

function advanceFinanceTick(world: World): void {
  const runtime = financeRuntime(world);
  if (!runtime || runtime.processingMode !== "queued") return;

  for (const tx of runtime.transactions) {
    if (tx.status === "scheduled" && (tx.arrivalTick ?? 0) <= world.tick) {
      tx.status = "waiting";
      tx.nextEligibleTick = world.tick;
    }
  }

  for (const tx of runtime.transactions) {
    if (tx.status !== "processing" || (tx.completesAt ?? Infinity) > world.tick) {
      continue;
    }
    const providerId = tx.routedTo ?? "";
    const state = providerStateAt(runtime, providerId, world.tick);
    const elapsedLatency =
      Math.max(1, world.tick - (tx.startedAt ?? world.tick)) *
      runtime.tickDurationMs;
    if (!state?.online || randomPercent(runtime) >= state.successRate) {
      completeProviderAttempt(runtime, providerId, false, elapsedLatency);
      failAttempt(world, tx);
    } else {
      completeProviderAttempt(runtime, providerId, true, elapsedLatency);
      tx.status = "succeeded";
      tx.completedAt = world.tick;
      tx.completesAt = undefined;
    }
  }

  for (const tx of runtime.transactions) {
    if (tx.status === "scheduled") continue;
    if (["succeeded", "failed", "declined", "lost"].includes(tx.status)) continue;
    tx.waited = Math.max(0, world.tick - (tx.arrivalTick ?? 0));
    const deadline = tx.deadlineTicks ?? runtime.expireAfter;
    if (deadline > 0 && tx.waited >= deadline) {
      if (tx.status === "processing" && tx.routedTo) {
        completeProviderAttempt(
          runtime,
          tx.routedTo,
          false,
          Math.max(1, world.tick - (tx.startedAt ?? world.tick)) *
            runtime.tickDurationMs,
        );
      }
      tx.status = "lost";
      tx.completedAt = world.tick;
      tx.completesAt = undefined;
      runtime.timedOut += 1;
      if (isPriority(tx)) runtime.priorityFailures += 1;
    }
  }

  runtime.queueArea += runtime.transactions.filter(
    (tx) => tx.status === "waiting" && tx.nextEligibleTick <= world.tick,
  ).length;
}

// ---------------------------------------------------------------------------
// Observation flags
// ---------------------------------------------------------------------------

function financeObserve(world: World): Record<string, number | boolean> {
  const runtime = financeRuntime(world)!;
  const tx = currentTx(world);
  const deadline = tx?.deadlineTicks ?? runtime.expireAfter;
  const timeWaiting = tx
    ? Math.max(tx.waited, world.tick - (tx.arrivalTick ?? 0))
    : 0;
  const terminal = runtime.transactions.filter((item) =>
    ["succeeded", "failed", "declined", "lost"].includes(item.status)
  );
  const completedDurations = terminal
    .filter((item) => item.completedAt !== undefined)
    .map((item) => item.completedAt! - (item.arrivalTick ?? 0));
  const averageProcessingTime = completedDurations.length
    ? completedDurations.reduce((sum, duration) => sum + duration, 0) /
      completedDurations.length
    : 0;

  const out: Record<string, number | boolean> = {
    finance: true,
    hasTransaction: tx !== null,
    amount: tx?.amount ?? 0,
    isConsumer: tx?.type === "consumer",
    isBusiness: tx?.type === "business",
    isInternational: tx?.type === "international",
    isPayroll: tx?.type === "payroll",
    isRefund: tx?.type === "refund",
    isSettlement: tx?.type === "settlement",
    isHighValue: (tx?.amount ?? 0) >= runtime.highValueThreshold,
    priority: tx?.priority ?? 0,
    isPriority: isPriority(tx ?? ({ priority: 0 } as FinanceRuntimeTx)),
    timeWaiting,
    processingTime: timeWaiting,
    deadlineRemaining: deadline > 0 ? Math.max(0, deadline - timeWaiting) : 999999,
    retryCount: Math.max(0, (tx?.attempts ?? 0) - 1),
    maxRetries: tx?.maxRetries ?? 0,
    canRetry: tx ? (tx.attempts === 0 || canRetry(tx, world)) : false,
    lastProviderA: tx?.routedTo === "A",
    lastProviderB: tx?.routedTo === "B",
    lastProviderC: tx?.routedTo === "C",
    queueDepth: countByStatus(world, "waiting"),
    inFlight: countByStatus(world, "processing"),
    totalTransactions: runtime.transactions.length,
    processed: processedCount(world),
    succeeded: countByStatus(world, "succeeded"),
    failed: countByStatus(world, "failed"),
    declined: countByStatus(world, "declined"),
    lost: countByStatus(world, "lost"),
    timedOut: runtime.timedOut,
    failedAttempts: runtime.failedAttempts,
    priorityFailures: runtime.priorityFailures,
    overloadRejects: runtime.overloadRejects,
    processingCost: runtime.processingCost,
    totalCost: runtime.totalCost,
    score: financeScore(world),
    averageProcessingTime,
    throughput: world.tick > 0 ? processedCount(world) / world.tick : 0,
    successRatio: runtime.transactions.length > 0
      ? countByStatus(world, "succeeded") / runtime.transactions.length
      : 0,
    allProcessed: allProcessed(world),
  };

  // Per-slot provider facts. Deliberately do not publish comparative answer
  // flags such as `cheapestA` or `bestValueA`: deciding which fact wins is the
  // learner's routing policy, not a condition the world should solve for them.
  for (const id of SLOTS) {
    const state = providerStateAt(runtime, id, world.tick);
    const exists = state !== null;
    out[`online${id}`] = exists ? state!.online : false;
    out[`fee${id}`] = exists ? state!.fee : 0;
    out[`success${id}`] = exists ? state!.successRate : 0;
    out[`successRate${id}`] = exists ? state!.successRate : 0;
    out[`latency${id}`] = exists ? state!.latency : 0;
    out[`currentLatency${id}`] = exists ? state!.latency : 0;
    out[`expectedCost${id}`] = exists ? expectedCost(state!, runtime.failurePenalty) : 0;
    out[`capacityRemaining${id}`] = exists ? state!.capacityRemaining : 0;
    out[`queueLength${id}`] = exists ? state!.active : 0;
    out[`congestion${id}`] = exists ? state!.congestion : 0;
    out[`healthScore${id}`] = exists ? state!.healthScore : 0;
    out[`observedSuccessRate${id}`] = exists ? state!.observedSuccessRate : 0;
    out[`averageLatency${id}`] = exists ? state!.averageLatency : 0;
    out[`utilization${id}`] = exists ? state!.utilization : 0;
    out[`attempts${id}`] = exists ? state!.attempts : 0;
    out[`completed${id}`] = exists ? state!.completed : 0;
    out[`canRoute${id}`] = canRoute(world, id);
  }
  return out;
}

export const FINANCE_FLAGS: DomainFlagSpec[] = [
  { id: "finance", type: "bool", label: "Finance", meaning: "This run uses payment-routing rules" },
  { id: "hasTransaction", type: "bool", label: "Has Transaction", meaning: "A payment is waiting at the head of the queue" },
  { id: "amount", type: "number", label: "Amount", meaning: "Naira amount of the current payment", format: "currency" },
  { id: "isConsumer", type: "bool", label: "Consumer Payment", meaning: "The current payment is a consumer transfer" },
  { id: "isBusiness", type: "bool", label: "Business Payment", meaning: "The current payment is a business payment" },
  { id: "isInternational", type: "bool", label: "International Payment", meaning: "The current payment is international" },
  { id: "isPayroll", type: "bool", label: "Payroll Payment", meaning: "The current payment is part of payroll" },
  { id: "isRefund", type: "bool", label: "Refund", meaning: "The current payment is a refund" },
  { id: "isSettlement", type: "bool", label: "Settlement", meaning: "The current payment is a merchant settlement" },
  { id: "isHighValue", type: "bool", label: "High Value", meaning: "The amount is at or above the high-value threshold" },
  { id: "priority", type: "number", label: "Priority", meaning: "Current payment priority from 0 to 3" },
  { id: "isPriority", type: "bool", label: "Priority Payment", meaning: "The current payment is urgent or critical" },
  { id: "timeWaiting", type: "number", label: "Time Waiting", meaning: "Ticks elapsed since the payment arrived" },
  { id: "processingTime", type: "number", label: "Processing Time", meaning: "Current age of the payment in ticks" },
  { id: "deadlineRemaining", type: "number", label: "Deadline Remaining", meaning: "Ticks remaining before this payment expires" },
  { id: "retryCount", type: "number", label: "Retry Count", meaning: "Additional attempts already made for this payment" },
  { id: "maxRetries", type: "number", label: "Maximum Retries", meaning: "Additional attempts allowed for this payment" },
  { id: "canRetry", type: "bool", label: "Can Retry", meaning: "The payment still has retry and deadline budget" },
  { id: "lastProviderA", type: "bool", label: "Last Attempt Used A", meaning: "The latest attempt used Provider A" },
  { id: "lastProviderB", type: "bool", label: "Last Attempt Used B", meaning: "The latest attempt used Provider B" },
  { id: "lastProviderC", type: "bool", label: "Last Attempt Used C", meaning: "The latest attempt used Provider C" },
  { id: "queueDepth", type: "number", label: "Queue Depth", meaning: "Payments still waiting to be processed" },
  { id: "inFlight", type: "number", label: "In Flight", meaning: "Payments currently being processed by providers" },
  { id: "totalTransactions", type: "number", label: "Total Transactions", meaning: "All payments in the scenario, including future arrivals" },
  { id: "processed", type: "number", label: "Processed", meaning: "Payments finalized so far" },
  { id: "succeeded", type: "number", label: "Succeeded", meaning: "Payments that went through" },
  { id: "failed", type: "number", label: "Failed", meaning: "Payments that failed" },
  { id: "declined", type: "number", label: "Declined", meaning: "Payments you declined" },
  { id: "lost", type: "number", label: "Lost", meaning: "Payments lost to expiry" },
  { id: "timedOut", type: "number", label: "Timed Out", meaning: "Payments that exceeded their deadlines" },
  { id: "failedAttempts", type: "number", label: "Failed Attempts", meaning: "Provider attempts that failed, including retryable failures" },
  { id: "priorityFailures", type: "number", label: "Priority Failures", meaning: "Urgent payments that failed, expired, or were declined" },
  { id: "overloadRejects", type: "number", label: "Overload Rejects", meaning: "Attempts rejected because provider concurrency was exhausted" },
  { id: "processingCost", type: "number", label: "Processing Cost", meaning: "Provider fees before penalties", format: "currency" },
  { id: "totalCost", type: "number", label: "Total Cost", meaning: "Cumulative fees + failure penalties", format: "currency" },
  { id: "score", type: "number", label: "Penalty Score", meaning: "Weighted cost, failures, timeouts, overload, priority misses, and queue pressure; lower is better" },
  { id: "averageProcessingTime", type: "number", label: "Average Processing Time", meaning: "Average ticks from arrival to terminal outcome" },
  { id: "throughput", type: "number", label: "Throughput", meaning: "Finalized payments per elapsed tick" },
  { id: "successRatio", type: "number", label: "Success Ratio", meaning: "Share of all payments completed successfully", format: "percentFraction" },
  { id: "allProcessed", type: "bool", label: "All Processed", meaning: "The queue is fully drained" },
  ...SLOTS.flatMap((id): DomainFlagSpec[] => [
    { id: `online${id}`, type: "bool", label: `Provider ${id} Online`, meaning: `Provider ${id} is currently online` },
    { id: `fee${id}`, type: "number", label: `Provider ${id} Fee`, meaning: `Provider ${id}'s fee for this payment`, format: "currency" },
    { id: `success${id}`, type: "number", label: `Provider ${id} Success %`, meaning: `Provider ${id}'s current success rate (0–100)`, format: "percent" },
    { id: `successRate${id}`, type: "number", label: `Provider ${id} Success Rate`, meaning: `Provider ${id}'s current success rate (0–100)`, format: "percent" },
    { id: `latency${id}`, type: "number", label: `Provider ${id} Latency`, meaning: `Provider ${id}'s latency in ms` },
    { id: `currentLatency${id}`, type: "number", label: `Provider ${id} Current Latency`, meaning: `Provider ${id}'s base latency plus live congestion` },
    { id: `expectedCost${id}`, type: "number", label: `Provider ${id} Expected Cost`, meaning: `Fee + expected failure cost for provider ${id}`, format: "currency" },
    { id: `capacityRemaining${id}`, type: "number", label: `Provider ${id} Capacity Remaining`, meaning: `Free concurrent processing slots at provider ${id}` },
    { id: `queueLength${id}`, type: "number", label: `Provider ${id} Queue Length`, meaning: `Payments currently in flight at provider ${id}` },
    { id: `congestion${id}`, type: "number", label: `Provider ${id} Congestion`, meaning: `Current load as a share of concurrent capacity`, format: "percentFraction" },
    { id: `healthScore${id}`, type: "number", label: `Provider ${id} Health Score`, meaning: `Live reliability score reduced by latency and congestion` },
    { id: `observedSuccessRate${id}`, type: "number", label: `Provider ${id} Observed Success Rate`, meaning: `Success percentage across provider ${id}'s 20 most recent completed attempts`, format: "percent" },
    { id: `averageLatency${id}`, type: "number", label: `Provider ${id} Average Latency`, meaning: `Average measured completion latency for provider ${id} in milliseconds` },
    { id: `utilization${id}`, type: "number", label: `Provider ${id} Utilization`, meaning: `Percentage of provider ${id}'s concurrent capacity currently in use`, format: "percent" },
    { id: `attempts${id}`, type: "number", label: `Provider ${id} Attempts`, meaning: `Routing attempts sent to provider ${id} during this run` },
    { id: `completed${id}`, type: "number", label: `Provider ${id} Completed Attempts`, meaning: `Provider ${id} attempts that have produced an outcome` },
    { id: `canRoute${id}`, type: "bool", label: `Can Route ${id}`, meaning: `Provider ${id} can handle the current payment` },
  ]),
];

// ---------------------------------------------------------------------------
// The module
// ---------------------------------------------------------------------------

export const financeModule: WorldModule = {
  id: "finance",
  tracksMovement: false,
  domainActions: ["routeToA", "routeToB", "routeToC", "hold", "decline"],
  domainFlags: FINANCE_FLAGS,
  validate: validateFinanceData,
  createDomain: createFinanceRuntime,
  applyAction: applyFinanceAction,
  advanceTick: advanceFinanceTick,
  resolveStatus(world: World): SimStatus | null {
    if (allProcessed(world)) {
      // A queue can become terminal because every payment expired or was
      // rejected. That is operationally finished, but it is not a successful
      // run. In particular, an unconditional hold policy must never appear to
      // solve a payment-routing challenge by timing out the entire queue.
      return countByStatus(world, "succeeded") > 0 ? "reached" : "stuck";
    }
    // Safety net: a brain that never routes must still terminate. Remaining
    // payments are marked lost and the run ends as "stuck" (objectives fail).
    if (world.tick >= (financeRuntime(world)?.maxTicks ?? Infinity)) {
      for (const t of financeRuntime(world)!.transactions) {
        if (["scheduled", "waiting", "processing"].includes(t.status)) {
          t.status = "lost";
        }
      }
      return "stuck";
    }
    return null;
  },
  observe: financeObserve,
};
