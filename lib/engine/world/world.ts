/**
 * The World owns all mutable simulation state: the grid, the agent, entities,
 * and the run status. It is the ONLY place actions cause change.
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

export interface Agent {
  position: Vec2;
  direction: Direction;
  state: string;
  memory: MemoryData;
  energy: number | null;
  /** Set of visited tile keys ("x,y"). */
  visited: Set<string>;
}

export class World {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly tiles: number[][];
  readonly start: Vec2;
  readonly goal: Vec2;
  readonly entities: EntityData[];

  agent: Agent;
  tick = 0;
  status: SimStatus = "idle";

  /** Whether the most recent moveForward was blocked by a wall/edge. */
  lastMoveBlocked = false;

  /**
   * Consecutive ticks the agent has ended standing on the goal. Reaching the
   * goal is not enough — the agent must *settle* there for `goalHoldTicks`
   * consecutive ticks, which proves a deliberate arrival rather than passing
   * over the tile on the way somewhere else.
   */
  ticksAtGoal = 0;

  /** How many consecutive ticks on the goal are required to complete. */
  goalHoldTicks: number;

  constructor(
    data: WorldData,
    entities: EntityData[],
    initialState: string,
    memory: MemoryData,
    goalHoldTicks = 3,
  ) {
    this.goalHoldTicks = goalHoldTicks;
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
    };
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

    if (this.agent.energy !== null) {
      this.agent.energy = Math.max(0, this.agent.energy - 1);
    }

    this.tick += 1;

    // Track how long the agent has settled on the goal. Stepping off resets it.
    this.ticksAtGoal = this.atGoal() ? this.ticksAtGoal + 1 : 0;

    // Resolve status after the action.
    if (this.ticksAtGoal >= this.goalHoldTicks) {
      this.status = "reached";
    } else if (this.agent.energy !== null && this.agent.energy <= 0) {
      this.status = "out-of-energy";
    } else {
      this.status = "running";
    }
  }
}
