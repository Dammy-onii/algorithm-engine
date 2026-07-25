/**
 * Builds the Observation handed to the agent each tick. This is the ONLY
 * information channel from world to agent — if a fact isn't here, the agent
 * cannot know it.
 */

import { Direction, Observation, TileKind } from "../types";
import { World } from "../world/world";
import {
  DIRECTIONS,
  add,
  delta,
  equals,
  isWalkable,
  key,
  tileKindAt,
  turnLeft,
  turnRight,
} from "../world/grid";

function wallInDirection(world: World, dir: Direction): boolean {
  const p = add(world.agent.position, delta(dir));
  return !isWalkable(world.tiles, p);
}

/**
 * Goal is "visible" if it sits on a straight cardinal line from the agent with
 * no wall in between (simple line-of-sight down a corridor). Returns the
 * direction toward the goal when visible.
 */
function computeGoalVisibility(world: World): {
  visible: boolean;
  direction: Direction | null;
} {
  const { position } = world.agent;
  const { goal } = world;

  for (const dir of DIRECTIONS) {
    const step = delta(dir);
    // Only scan along the axis the goal actually lies on.
    if (step.x !== 0 && goal.y !== position.y) continue;
    if (step.y !== 0 && goal.x !== position.x) continue;

    let cursor = add(position, step);
    // Walk until we hit a wall/edge or reach the goal.
    while (isWalkable(world.tiles, cursor)) {
      if (equals(cursor, goal)) {
        return { visible: true, direction: dir };
      }
      cursor = add(cursor, step);
    }
  }

  return { visible: false, direction: null };
}

export function buildObservation(world: World): Observation {
  const { agent } = world;
  const dir = agent.direction;

  const neighbors = {} as Record<Direction, TileKind>;
  for (const d of DIRECTIONS) {
    neighbors[d] = tileKindAt(world.tiles, add(agent.position, delta(d)));
  }

  const { visible, direction } = computeGoalVisibility(world);
  const aheadPos = add(agent.position, delta(dir));

  return {
    tick: world.tick,
    position: { ...agent.position },
    direction: dir,
    wallAhead: wallInDirection(world, dir),
    wallLeft: wallInDirection(world, turnLeft(dir)),
    wallRight: wallInDirection(world, turnRight(dir)),
    neighbors,
    goalVisible: visible,
    goalDirection: direction,
    atGoal: world.atGoal(),
    visitedAhead: agent.visited.has(key(aheadPos)),
    visitedCount: agent.visited.size,
    energy: agent.energy,
    // Domain-specific facts come from the active world module.
    domain: world.module.observe(world),
  };
}
