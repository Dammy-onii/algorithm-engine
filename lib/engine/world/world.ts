/**
 * The World owns all mutable simulation state: the grid, the agent, entities,
 * and the run status. It is the ONLY place actions cause change.
 *
 * The World is domain-agnostic. Anything world-type-specific — a domain runtime,
 * domain actions, completion rules, domain observation
 * flags — lives in a WorldModule (see lib/engine/worlds/). The World resolves its
 * module from `data.kind`, holds an opaque `domain` runtime the module manages,
 * and delegates domain actions, completion, and observation to it.
 *
 * The agent never touches this object directly — the engine reads from it to
 * build observations and writes to it by applying a single Action per tick.
 */

import {
  Action,
  Direction,
  EntityData,
  MemoryData,
  SimStatus,
  Vec2,
  WorldData,
} from "../types";
import {
  add,
  delta,
  equals,
  isWalkable,
  key,
  turnLeft,
  turnRight,
} from "./grid";
import type { WorldModule } from "../worlds/module";
import { resolveWorldModule } from "../worlds/registry";

export interface Agent {
  position: Vec2;
  direction: Direction;
  state: string;
  memory: MemoryData;
  energy: number | null;
  /** Set of visited tile keys ("x,y"). */
  visited: Set<string>;
  /** Ids of domain items currently carried. */
  cargo: string[];
}

export class World {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly tiles: number[][];
  readonly start: Vec2;
  readonly goal: Vec2;
  readonly entities: EntityData[];

  /** The world type behaviour selected by `WorldData.kind`. */
  readonly module: WorldModule;
  /** Opaque per-world-type runtime the module owns; null for the base grid. */
  domain: unknown;

  agent: Agent;
  tick = 0;
  status: SimStatus = "idle";

  /** Whether the most recent moveForward was blocked by a wall/edge. */
  lastMoveBlocked = false;

  /**
   * Consecutive ticks the agent has ended standing on the goal (maze module).
   * Reaching the goal is not enough — the agent must *settle* there.
   */
  ticksAtGoal = 0;

  /** How many consecutive ticks on the goal are required to complete. */
  goalHoldTicks: number;
  /** Maximum energy restored by a valid charge action. */
  readonly energyCapacity: number | null;

  constructor(
    data: WorldData,
    entities: EntityData[],
    initialState: string,
    memory: MemoryData,
    goalHoldTicks = 3,
  ) {
    this.goalHoldTicks = goalHoldTicks;
    this.energyCapacity = data.energy ?? null;
    this.name = data.name;
    this.width = data.width;
    this.height = data.height;
    this.tiles = data.tiles;
    this.start = data.start;
    this.goal = data.goal;
    this.entities = entities;

    this.agent = {
      position: { ...data.start },
      direction: data.startDirection ?? "E",
      state: initialState,
      memory: structuredClone(memory),
      energy: data.energy ?? null,
      visited: new Set<string>([key(data.start)]),
      cargo: [],
    };

    this.module = resolveWorldModule(data.kind);
    this.domain = this.module.createDomain(data);
  }

  atGoal(): boolean {
    return equals(this.agent.position, this.goal);
  }

  /** Position of the tile directly in front of the agent. */
  aheadPosition(): Vec2 {
    return add(this.agent.position, delta(this.agent.direction));
  }

  /**
   * Execute exactly one action and advance the world by one tick.
   * Returns nothing — read the updated state via the World's fields.
   */
  apply(action: Action): void {
    this.lastMoveBlocked = false;

    // Let the world module handle its own actions; base movement otherwise.
    const handled = this.module.applyAction(this, action);
    if (!handled) {
      switch (action.type) {
        case "moveForward": {
          const target = this.aheadPosition();
          if (isWalkable(this.tiles, target)) {
            this.agent.position = target;
            this.agent.visited.add(key(target));
          } else {
            this.lastMoveBlocked = true;
          }
          break;
        }
        case "turnLeft":
          this.agent.direction = turnLeft(this.agent.direction);
          break;
        case "turnRight":
          this.agent.direction = turnRight(this.agent.direction);
          break;
        case "wait":
          break;
      }
    }

    if (this.agent.energy !== null) {
      this.agent.energy = Math.max(0, this.agent.energy - 1);
    }

    this.tick += 1;
    this.module.advanceTick?.(this);

    // Completion is module-owned; otherwise fall through to energy / running.
    const domainStatus = this.module.resolveStatus(this);
    if (domainStatus) {
      this.status = domainStatus;
    } else if (this.agent.energy !== null && this.agent.energy <= 0) {
      this.status = "out-of-energy";
    } else {
      this.status = "running";
    }
  }
}
