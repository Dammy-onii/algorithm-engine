/**
 * Objective evaluation — grading an algorithm, not just checking correctness.
 *
 * A challenge defines machine-checkable objectives whose `check` expression is
 * evaluated (with the engine's own safe evaluator) against a flat set of metrics
 * describing how a run went. This is the scoring substrate the later milestones
 * (progression, interviews, competition) build on: "reached" is the floor; the
 * interesting objectives are about efficiency, economy, and simplicity.
 */

import { Simulation } from "@/lib/engine/simulation";
import { VisualBrain, ChallengeObjective } from "./types";
import { EvalContext, evaluateCondition } from "@/lib/engine/decision/condition";

/** Everything an objective's `check` expression may reference. */
export interface RunMetrics {
  /** Did the agent settle on the goal? */
  reached: boolean;
  stuck: boolean;
  outOfEnergy: boolean;
  /** Ticks elapsed when the run ended. */
  ticks: number;
  /** Distinct tiles visited. */
  visited: number;
  /** Energy remaining at the end (Infinity when the world has no energy stat). */
  energy: number;
  /** How much of the run's path was revisiting (0 = never retread). */
  revisits: number;
  /** Authoring-complexity metrics — reward simpler intelligence. */
  rules: number;
  functions: number;
  states: number;
  conditions: number;
}

/** Read metrics from a simulation in whatever state it is currently in. */
export function metricsFromSim(sim: Simulation, brain: VisualBrain): RunMetrics {
  const w = sim.world;
  const status = sim.status;
  const startTiles = 1; // the start tile is pre-marked visited
  const moved = Math.max(0, w.agent.visited.size - startTiles);
  // Revisits = steps that did not open a new tile. Approximated from the tick
  // count vs. distinct tiles, floored at 0 (turns/holds also cost ticks).
  const revisits = Math.max(0, w.tick - moved);

  return {
    reached: status === "reached",
    stuck: status === "stuck",
    outOfEnergy: status === "out-of-energy",
    ticks: w.tick,
    visited: w.agent.visited.size,
    energy: w.agent.energy ?? Number.POSITIVE_INFINITY,
    revisits,
    rules: brain.rules.length,
    functions: brain.functions.filter((f) => !f.isBuiltIn).length,
    states: brain.states.length,
    conditions: brain.derived.length,
  };
}

/**
 * Run a simulation to completion headlessly and collect its metrics. Pure: does
 * not touch the UI. `maxTicks` guards against a brain that never settles.
 */
export function measureRun(
  sim: Simulation,
  brain: VisualBrain,
  maxTicks = 4000,
): RunMetrics {
  let guard = 0;
  while (!sim.isDone && guard < maxTicks) {
    sim.tick();
    guard++;
  }
  return metricsFromSim(sim, brain);
}

function metricsToContext(m: RunMetrics): EvalContext {
  return {
    reached: m.reached,
    stuck: m.stuck,
    outOfEnergy: m.outOfEnergy,
    ticks: m.ticks,
    visited: m.visited,
    energy: m.energy,
    revisits: m.revisits,
    rules: m.rules,
    functions: m.functions,
    states: m.states,
    conditions: m.conditions,
    always: true,
    never: false,
  };
}

export interface ObjectiveResult {
  id: string;
  label: string;
  bonus: boolean;
  met: boolean;
  /** Set when the check expression itself is malformed. */
  error?: string;
}

/** Evaluate every objective's check against a run's metrics. */
export function evaluateObjectives(
  objectives: ChallengeObjective[],
  metrics: RunMetrics,
): ObjectiveResult[] {
  const ctx = metricsToContext(metrics);
  return objectives.map((o) => {
    try {
      return {
        id: o.id,
        label: o.label,
        bonus: o.bonus ?? false,
        met: evaluateCondition(o.check, ctx),
      };
    } catch (e) {
      return {
        id: o.id,
        label: o.label,
        bonus: o.bonus ?? false,
        met: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });
}

/** A challenge is passed when every non-bonus objective is met. */
export function challengePassed(results: ObjectiveResult[]): boolean {
  const required = results.filter((r) => !r.bonus);
  // No explicit required objectives → fall back to "reached" if present.
  if (required.length === 0) return results.some((r) => r.met);
  return required.every((r) => r.met);
}
