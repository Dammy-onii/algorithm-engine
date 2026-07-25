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
  successRate?: number;
  latency?: number;
}

export interface FinanceProvider {
  /** Short id; the routing action `routeTo<Id>` targets it (A, B, C). */
  id: string;
  name: string;
  /** Flat fee charged per routing attempt, in dollars. */
  fee: number;
  /** Reliability as a percentage 0–100. */
  successRate: number;
  /** Round-trip latency in milliseconds. */
  latency: number;
  online: boolean;
  /** Max attempts this provider can take in a run. Omit for unlimited. */
  capacity?: number;
  /** Transaction types it can process. Omit to accept all. */
  accepts?: string[];
  /** Deterministic health changes over time. */
  schedule?: FinanceProviderEvent[];
}

export interface FinanceTransaction {
  id: string;
  amount: number;
  /** "consumer" | "business" | "international" (free-form). */
  type?: string;
  destination?: string;
}

export interface FinanceConfig {
  /** Seed for the reproducible success/failure draw. Defaults to 1. */
  seed?: number;
  providers: FinanceProvider[];
  transactions: FinanceTransaction[];
  /** Support cost booked when a payment fails. Defaults to 0. */
  failurePenalty?: number;
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
  if (!Array.isArray(config.transactions) || config.transactions.length === 0) {
    throw new Error("[finance] at least one transaction is required");
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
    ids.add(p.id);
  }
  const txIds = new Set<string>();
  for (const t of config.transactions) {
    if (!t.id) throw new Error("[finance] a transaction has an empty id");
    if (txIds.has(t.id)) throw new Error(`[finance] duplicate transaction '${t.id}'`);
    if (typeof t.amount !== "number" || t.amount < 0) {
      throw new Error(`[finance] transaction '${t.id}' needs a non-negative amount`);
    }
    txIds.add(t.id);
  }
}

// ---------------------------------------------------------------------------
// Runtime (mutable; never mutate the source JSON)
// ---------------------------------------------------------------------------

export type TxStatus = "waiting" | "succeeded" | "failed" | "declined" | "lost";

export interface FinanceRuntimeTx extends FinanceTransaction {
  status: TxStatus;
  /** Provider the payment was routed through, once finalized. */
  routedTo?: string;
  /** Ticks spent waiting in the queue. */
  waited: number;
  attempts: number;
}

export interface FinanceRuntime {
  providers: FinanceProvider[];
  transactions: FinanceRuntimeTx[];
  totalCost: number;
  failurePenalty: number;
  highValueThreshold: number;
  expireAfter: number;
  maxTicks: number;
  /** LCG state for reproducible outcome draws. */
  rng: number;
}

export function createFinanceRuntime(data: WorldData): FinanceRuntime | null {
  const config = financeConfig(data);
  if (data.kind !== "finance" || !config) return null;

  const maxPerTx = config.maxTicksPerTx ?? 30;
  return {
    providers: structuredClone(config.providers),
    transactions: config.transactions.map((t) => ({
      ...structuredClone(t),
      status: "waiting" as const,
      waited: 0,
      attempts: 0,
    })),
    totalCost: 0,
    failurePenalty: config.failurePenalty ?? 0,
    highValueThreshold: config.highValueThreshold ?? 10000,
    expireAfter: config.expireAfter ?? 0,
    maxTicks: config.transactions.length * maxPerTx + 50,
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
export function currentTx(world: World): FinanceRuntimeTx | null {
  return financeRuntime(world)?.transactions.find((t) => t.status === "waiting") ?? null;
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
  let successRate = p.successRate;
  let latency = p.latency;
  for (const ev of [...(p.schedule ?? [])].sort((a, b) => a.atTick - b.atTick)) {
    if (ev.atTick <= tick) {
      if (ev.online !== undefined) online = ev.online;
      if (ev.successRate !== undefined) successRate = ev.successRate;
      if (ev.latency !== undefined) latency = ev.latency;
    }
  }
  const handled = runtime.transactions.filter((t) => t.routedTo === id).length;
  return {
    id: p.id,
    name: p.name,
    fee: p.fee,
    successRate,
    latency,
    online,
    handled,
    capacity: p.capacity ?? Infinity,
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
  if (state.handled >= state.capacity) return false;
  const provider = runtime.providers.find((p) => p.id === id);
  if (provider?.accepts && tx.type && !provider.accepts.includes(tx.type)) return false;
  return true;
}

export function countByStatus(world: World, status: TxStatus): number {
  return financeRuntime(world)?.transactions.filter((t) => t.status === status).length ?? 0;
}

export function processedCount(world: World): number {
  return financeRuntime(world)?.transactions.filter((t) => t.status !== "waiting").length ?? 0;
}

export function allProcessed(world: World): boolean {
  const runtime = financeRuntime(world);
  return !!runtime && runtime.transactions.every((t) => t.status !== "waiting");
}

export function totalCost(world: World): number {
  return financeRuntime(world)?.totalCost ?? 0;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function route(world: World, slot: Slot): void {
  const runtime = financeRuntime(world)!;
  const tx = currentTx(world);
  if (!tx) return;
  const state = providerStateAt(runtime, slot, world.tick);
  tx.attempts += 1;
  tx.routedTo = slot;

  // Booking the fee models paying the provider to attempt the payment.
  const fee = state?.fee ?? 0;
  runtime.totalCost += fee;

  // Routing to an unavailable provider (offline / over capacity / wrong type)
  // fails the payment — this is what the "check the provider first" lessons teach.
  if (!canRoute(world, slot)) {
    tx.status = "failed";
    runtime.totalCost += runtime.failurePenalty;
    return;
  }

  // Reproducible success draw: LCG advance → [0,100).
  runtime.rng = (Math.imul(runtime.rng, 1664525) + 1013904223) >>> 0;
  const roll = (runtime.rng / 0x100000000) * 100;
  if (roll < (state?.successRate ?? 0)) {
    tx.status = "succeeded";
  } else {
    tx.status = "failed";
    runtime.totalCost += runtime.failurePenalty;
  }
}

function applyFinanceAction(world: World, action: Action): boolean {
  const runtime = financeRuntime(world);
  if (!runtime) return false;

  const slot = ROUTE_ACTION[action.type];
  if (slot) {
    route(world, slot);
    return true;
  }
  if (action.type === "decline") {
    const tx = currentTx(world);
    if (tx) tx.status = "declined";
    return true;
  }
  if (action.type === "hold") {
    const tx = currentTx(world);
    if (tx) {
      tx.waited += 1;
      if (runtime.expireAfter > 0 && tx.waited > runtime.expireAfter) {
        tx.status = "lost";
      }
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Observation flags
// ---------------------------------------------------------------------------

function financeObserve(world: World): Record<string, number | boolean> {
  const runtime = financeRuntime(world)!;
  const tx = currentTx(world);

  const out: Record<string, number | boolean> = {
    finance: true,
    hasTransaction: tx !== null,
    amount: tx?.amount ?? 0,
    isConsumer: tx?.type === "consumer",
    isBusiness: tx?.type === "business",
    isInternational: tx?.type === "international",
    isHighValue: (tx?.amount ?? 0) >= runtime.highValueThreshold,
    queueDepth: countByStatus(world, "waiting"),
    processed: processedCount(world),
    succeeded: countByStatus(world, "succeeded"),
    failed: countByStatus(world, "failed"),
    declined: countByStatus(world, "declined"),
    lost: countByStatus(world, "lost"),
    totalCost: runtime.totalCost,
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
    out[`latency${id}`] = exists ? state!.latency : 0;
    out[`expectedCost${id}`] = exists ? expectedCost(state!, runtime.failurePenalty) : 0;
    out[`canRoute${id}`] = canRoute(world, id);
  }
  return out;
}

export const FINANCE_FLAGS: DomainFlagSpec[] = [
  { id: "finance", type: "bool", label: "Finance", meaning: "This run uses payment-routing rules" },
  { id: "hasTransaction", type: "bool", label: "Has Transaction", meaning: "A payment is waiting at the head of the queue" },
  { id: "amount", type: "number", label: "Amount", meaning: "Dollar amount of the current payment" },
  { id: "isConsumer", type: "bool", label: "Consumer Payment", meaning: "The current payment is a consumer transfer" },
  { id: "isBusiness", type: "bool", label: "Business Payment", meaning: "The current payment is a business payment" },
  { id: "isInternational", type: "bool", label: "International Payment", meaning: "The current payment is international" },
  { id: "isHighValue", type: "bool", label: "High Value", meaning: "The amount is at or above the high-value threshold" },
  { id: "queueDepth", type: "number", label: "Queue Depth", meaning: "Payments still waiting to be processed" },
  { id: "processed", type: "number", label: "Processed", meaning: "Payments finalized so far" },
  { id: "succeeded", type: "number", label: "Succeeded", meaning: "Payments that went through" },
  { id: "failed", type: "number", label: "Failed", meaning: "Payments that failed" },
  { id: "declined", type: "number", label: "Declined", meaning: "Payments you declined" },
  { id: "lost", type: "number", label: "Lost", meaning: "Payments lost to expiry" },
  { id: "totalCost", type: "number", label: "Total Cost", meaning: "Cumulative fees + failure penalties" },
  { id: "allProcessed", type: "bool", label: "All Processed", meaning: "The queue is fully drained" },
  ...SLOTS.flatMap((id): DomainFlagSpec[] => [
    { id: `online${id}`, type: "bool", label: `Provider ${id} Online`, meaning: `Provider ${id} is currently online` },
    { id: `fee${id}`, type: "number", label: `Provider ${id} Fee`, meaning: `Provider ${id}'s fee for this payment` },
    { id: `success${id}`, type: "number", label: `Provider ${id} Success %`, meaning: `Provider ${id}'s current success rate (0–100)` },
    { id: `latency${id}`, type: "number", label: `Provider ${id} Latency`, meaning: `Provider ${id}'s latency in ms` },
    { id: `expectedCost${id}`, type: "number", label: `Provider ${id} Expected Cost`, meaning: `Fee + expected failure cost for provider ${id}` },
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
  resolveStatus(world: World): SimStatus | null {
    if (allProcessed(world)) return "reached";
    // Safety net: a brain that never routes must still terminate. Remaining
    // payments are marked lost and the run ends as "stuck" (objectives fail).
    if (world.tick >= (financeRuntime(world)?.maxTicks ?? Infinity)) {
      for (const t of financeRuntime(world)!.transactions) {
        if (t.status === "waiting") t.status = "lost";
      }
      return "stuck";
    }
    return null;
  },
  observe: financeObserve,
};
