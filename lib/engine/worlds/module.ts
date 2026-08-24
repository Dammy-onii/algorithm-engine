/**
 * WorldModule — the seam that keeps the engine domain-agnostic.
 *
 * The engine core (World, the tick loop, the decision pipeline) knows how to run
 * a grid simulation but nothing about what a "warehouse" or a "maze" *is*. Each
 * world type provides a WorldModule that owns its domain behaviour:
 *
 *   - how to build its mutable runtime from world data,
 *   - how its own actions mutate that runtime,
 *   - when the run is complete, and
 *   - what domain-specific facts it exposes to observations.
 *
 * Adding a new world type = implementing a WorldModule + registering it. No edits
 * to the engine core. See docs/CONTENT_ARCHITECTURE.md (Tier 3).
 */

import type { Action, SimStatus, WorldData } from "../types";
import type { World } from "../world/world";

export interface DomainFlagSpec {
  id: string;
  type: "bool" | "number";
  label: string;
  meaning: string;
  /** Optional debug/display formatting for numeric observations. */
  format?: "decimal" | "percent" | "percentFraction" | "currency";
}

export interface WorldModule {
  /** Matches WorldData.kind. */
  id: string;

  /**
   * Whether newly-visited tiles are this world's progress signal. The engine's
   * generic "no new tile for N ticks ⇒ stuck" heuristic only makes sense for
   * movement-based worlds such as Maze. Operational worlds such as Warehouse,
   * Supermarket, Finance, and Parking set this false and own termination through
   * `resolveStatus`. Defaults to true.
   */
  readonly tracksMovement?: boolean;

  /** Domain action ids this world understands, beyond base movement. */
  readonly domainActions: readonly string[];

  /** Domain condition names this module may expose. */
  readonly domainFlags: readonly DomainFlagSpec[];

  /**
   * Precondition for each domain action, as a condition expression over the
   * observation flags (e.g. `pickUp → "packageHere && capacityRemaining > 0"`).
   * The decision layer uses these to select the first authored rule whose
   * action is actually possible. Ordered rule flow skips an impossible branch
   * and continues to the next matching rule. Actions omitted here are always
   * considered possible.
   */
  readonly actionPreconditions?: Readonly<Record<string, string>>;

  /** Validate this module's extension of the shared WorldData contract. */
  validate(data: WorldData): void;

  /** Build the mutable domain runtime from immutable world data (or null). */
  createDomain(data: WorldData): unknown;

  /**
   * Apply a domain action to the world. Returns true if this module handled the
   * action; false lets the base engine handle movement primitives.
   */
  applyAction(world: World, action: Action): boolean;

  /**
   * Advance autonomous domain activity after the world clock moves. This is for
   * systems that continue changing between decisions: provider queues complete
   * work, transactions arrive or expire, and health schedules take effect.
   * Grid worlds omit it.
   */
  advanceTick?(world: World): void;

  /**
   * Domain completion check, run once per tick after the action. Returns a
   * terminal status ("reached") when the run is done, else null to defer to the
   * base rules (energy, running). May update world bookkeeping (e.g. goal-hold).
   */
  resolveStatus(world: World): SimStatus | null;

  /** Domain observation flags merged into the agent's observation each tick. */
  observe(world: World): Record<string, number | boolean>;
}
