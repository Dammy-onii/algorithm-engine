/**
 * Optional object-oriented control surface for a Simulation.
 *
 * A controller is called once per tick with the same immutable observation that
 * feeds the visual rules system. It owns algorithm state; the engine still owns
 * action validation, world mutation, scoring, and the simulation clock.
 */

import type { ActionType, Observation } from "./types";

export interface AgentController {
  /** Return the one primitive action to attempt for this tick. */
  decide(observation: Readonly<Observation>): ActionType;
  /** Optional lifecycle hook invoked by Simulation.reset(). */
  reset?(): void;
}

export function assertAgentController(value: unknown): asserts value is AgentController {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as { decide?: unknown }).decide !== "function"
  ) {
    throw new Error("Controller code must return an object with decide(observation).");
  }
}

