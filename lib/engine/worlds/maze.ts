/**
 * Maze world module.
 *
 * The maze has no domain runtime and no domain actions — it is the base grid.
 * Its only domain behaviour is the completion rule: the agent must *settle* on
 * the goal for `goalHoldTicks` consecutive ticks (tracked as world.ticksAtGoal),
 * not merely pass over it.
 */

import type { SimStatus } from "../types";
import type { World } from "../world/world";
import type { WorldModule } from "./module";

export const mazeModule: WorldModule = {
  id: "maze",
  domainActions: [],
  domainFlags: [],
  validate: () => {},
  createDomain: () => null,
  applyAction: () => false, // all maze actions are base movement primitives
  resolveStatus(world: World): SimStatus | null {
    // Track consecutive ticks ended on the goal; stepping off resets.
    world.ticksAtGoal = world.atGoal() ? world.ticksAtGoal + 1 : 0;
    return world.ticksAtGoal >= world.goalHoldTicks ? "reached" : null;
  },
  observe: () => ({}),
};
