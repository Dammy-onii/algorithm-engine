import type { Simulation } from "@/lib/engine/simulation";
import type { SimStep } from "@/lib/engine/types";

/** A running simulation and its latest immutable render/debug snapshot. */
export interface SimulationSession {
  sim: Simulation;
  step: SimStep;
}
