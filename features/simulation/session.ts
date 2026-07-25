import {
  Simulation,
  type BrainSource,
  type SimulationConfig,
} from "@/lib/engine/simulation";
import { findWorld } from "@/lib/content/datasets";
import type { SimulationSession } from "@/features/simulation/types";

export type SessionResult =
  | { session: SimulationSession }
  | { error: string };

/** Build a validated simulation session from a registered world and brain. */
export function createSimulationSession(
  worldKey: string,
  brainSource: BrainSource,
  config: SimulationConfig = {},
): SessionResult {
  try {
    const simulation = new Simulation(
      findWorld(worldKey).source,
      brainSource,
      config,
    );
    return {
      session: {
        sim: simulation,
        step: simulation.snapshot(),
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
