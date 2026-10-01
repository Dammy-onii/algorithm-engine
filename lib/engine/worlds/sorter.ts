/**
 * Sorter world module — the Sorting Desk.
 *
 * The simplest decision a policy can make: one item arrives at a time, and the
 * brain chooses which of two bins it belongs in. There is no movement, timing,
 * or resource pressure — just "look at the item, decide, send it". That makes
 * it the beginner on-ramp: every scenario is one fact mapped to one choice.
 *
 * The module is scenario-agnostic. A world supplies its items, the two bin
 * labels, and `binARule` — a condition expression over the item's facts that
 * says which items belong in Bin A (everything else belongs in Bin B). The
 * same module therefore serves "fragile parcels", "even or odd", and
 * "prime or not prime" without a code change.
 *
 * Because the condition grammar has no arithmetic, number properties such as
 * evenness and primality are computed here and published as boolean facts.
 */

import type { Action, SimStatus, WorldData } from "../types";
import type { World } from "../world/world";
import type { DomainFlagSpec, WorldModule } from "./module";
import { evaluateCondition } from "../decision/condition";

// ---------------------------------------------------------------------------
// Data schema — owned by this module, not the shared engine types.
// ---------------------------------------------------------------------------

export interface SorterItem {
  id: string;
  /** What the learner sees on the conveyor, e.g. "Glass vase" or "7". */
  label: string;
  /** Optional number; drives isEven / isOdd / isPrime. */
  number?: number;
  fragile?: boolean;
}

export interface SorterBin {
  label: string;
}

export interface SorterConfig {
  binA: SorterBin;
  binB: SorterBin;
  /** Items for which this expression is true belong in Bin A; the rest in Bin B. */
  binARule: string;
  items: SorterItem[];
}

type SorterWorldData = WorldData & { sorter?: SorterConfig };

function sorterConfig(data: WorldData): SorterConfig | undefined {
  return (data as SorterWorldData).sorter;
}

export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) return false;
  }
  return true;
}

/** The facts one item exposes — to the learner's rules and to `binARule`. */
export function itemFacts(item: SorterItem | null): Record<string, number | boolean> {
  const hasNumber = typeof item?.number === "number";
  const n = item?.number ?? 0;
  return {
    hasItem: item !== null,
    number: n,
    isEven: hasNumber && Number.isInteger(n) && n % 2 === 0,
    isOdd: hasNumber && Number.isInteger(n) && n % 2 !== 0,
    isPrime: hasNumber && isPrime(n),
    isFragile: item?.fragile === true,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateSorterData(data: WorldData): void {
  const config = sorterConfig(data);
  if (!config) throw new Error("[sorter] world is missing sorter configuration");
  if (!config.binA?.label || !config.binB?.label) {
    throw new Error("[sorter] both bins need a label");
  }
  if (!Array.isArray(config.items) || config.items.length === 0) {
    throw new Error("[sorter] at least one item is required");
  }
  const ids = new Set<string>();
  for (const item of config.items) {
    if (!item.id) throw new Error("[sorter] an item has an empty id");
    if (ids.has(item.id)) throw new Error(`[sorter] duplicate item '${item.id}'`);
    if (!item.label) throw new Error(`[sorter] item '${item.id}' needs a label`);
    ids.add(item.id);
    try {
      evaluateCondition(config.binARule, itemFacts(item));
    } catch (error) {
      throw new Error(
        `[sorter] binARule '${config.binARule}' is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Runtime (mutable; never mutate the source JSON)
// ---------------------------------------------------------------------------

export type SorterBinId = "A" | "B";

export interface SortedItem extends SorterItem {
  bin: SorterBinId;
  correctBin: SorterBinId;
}

export interface SorterRuntime {
  binA: SorterBin;
  binB: SorterBin;
  /** Items still on the conveyor; the head is the one being decided. */
  queue: SorterItem[];
  /** Items already sent to a bin, in the order they were sorted. */
  sorted: SortedItem[];
  totalItems: number;
  /** Safety cap so a policy that never sorts still ends. */
  maxTicks: number;
  correctBinFor(item: SorterItem): SorterBinId;
}

export function createSorterRuntime(data: WorldData): SorterRuntime | null {
  const config = sorterConfig(data);
  if (data.kind !== "sorter" || !config) return null;
  const rule = config.binARule;
  return {
    binA: { ...config.binA },
    binB: { ...config.binB },
    queue: structuredClone(config.items),
    sorted: [],
    totalItems: config.items.length,
    maxTicks: config.items.length * 5 + 20,
    correctBinFor: (item) => (evaluateCondition(rule, itemFacts(item)) ? "A" : "B"),
  };
}

export function sorterRuntime(world: World): SorterRuntime | null {
  if (world.module.id !== "sorter") return null;
  return (world.domain as SorterRuntime | null) ?? null;
}

export function sorterMistakes(runtime: SorterRuntime): number {
  return runtime.sorted.filter((item) => item.bin !== item.correctBin).length;
}

function applySorterAction(world: World, action: Action): boolean {
  const runtime = sorterRuntime(world);
  if (!runtime) return false;
  const bin: SorterBinId | null =
    action.type === "sendToA" ? "A" : action.type === "sendToB" ? "B" : null;
  if (!bin) return false;
  const item = runtime.queue.shift();
  if (item) {
    runtime.sorted.push({ ...item, bin, correctBin: runtime.correctBinFor(item) });
  }
  return true;
}

function sorterObserve(world: World): Record<string, number | boolean> {
  const runtime = sorterRuntime(world)!;
  const mistakes = sorterMistakes(runtime);
  return {
    ...itemFacts(runtime.queue[0] ?? null),
    sortedCount: runtime.sorted.length,
    correct: runtime.sorted.length - mistakes,
    mistakes,
    remaining: runtime.queue.length,
    totalItems: runtime.totalItems,
    allSorted: runtime.queue.length === 0,
  };
}

export const SORTER_FLAGS: DomainFlagSpec[] = [
  { id: "hasItem", type: "bool", label: "Has Item", meaning: "An item is waiting at the sorting point" },
  { id: "number", type: "number", label: "Number", meaning: "The number on the current item (0 when it has none)" },
  { id: "isEven", type: "bool", label: "Is Even", meaning: "The current number divides evenly by 2" },
  { id: "isOdd", type: "bool", label: "Is Odd", meaning: "The current number does not divide evenly by 2" },
  { id: "isPrime", type: "bool", label: "Is Prime", meaning: "The current number is greater than 1 and divisible only by 1 and itself" },
  { id: "isFragile", type: "bool", label: "Is Fragile", meaning: "The current parcel is marked fragile" },
  { id: "sortedCount", type: "number", label: "Sorted", meaning: "Items already sent to a bin" },
  { id: "correct", type: "number", label: "Correct", meaning: "Items sent to the right bin" },
  { id: "mistakes", type: "number", label: "Mistakes", meaning: "Items sent to the wrong bin" },
  { id: "remaining", type: "number", label: "Remaining", meaning: "Items still waiting on the conveyor" },
  { id: "totalItems", type: "number", label: "Total Items", meaning: "All items in this scenario" },
  { id: "allSorted", type: "bool", label: "All Sorted", meaning: "The conveyor is empty" },
];

export const sorterModule: WorldModule = {
  id: "sorter",
  tracksMovement: false,
  domainActions: ["sendToA", "sendToB"],
  domainFlags: SORTER_FLAGS,
  actionPreconditions: {
    sendToA: "hasItem",
    sendToB: "hasItem",
  },
  validate: validateSorterData,
  createDomain: createSorterRuntime,
  applyAction: applySorterAction,
  resolveStatus(world: World): SimStatus | null {
    const runtime = sorterRuntime(world);
    if (!runtime) return null;
    // Finished once the conveyor is empty; objectives grade the mistakes.
    if (runtime.queue.length === 0) return "reached";
    if (world.tick >= runtime.maxTicks) return "stuck";
    return null;
  },
  observe: sorterObserve,
};
