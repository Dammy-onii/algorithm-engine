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
import { VisualBrain, ChallengeObjective, TaskStep } from "./types";
import {
  EvalContext,
  evaluateCondition,
  contextFromObservation,
} from "@/lib/engine/decision/condition";
import { buildObservation } from "@/lib/engine/decision/observation";

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
  /**
   * The active world module's domain facts at the end of the run (e.g. finance's
   * `totalCost` / `failed` / `allProcessed`). Merged into the objective context so
   * a challenge can grade on domain outcomes, not just the fixed maze metrics.
   */
  domain: Record<string, number | boolean>;
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
    // Live domain (module.observe over the current world) — NOT the SimStep
    // snapshot, which is built pre-action and would be one tick stale exactly
    // when the run completes.
    domain: buildObservation(w).domain,
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
    // Domain facts first so the fixed metrics below win on any name collision.
    ...(m.domain ?? {}),
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

// ---------------------------------------------------------------------------
// Live task flow — evaluate a checklist against the run *as it happens*
// ---------------------------------------------------------------------------

/**
 * The evaluation context for live task steps: run-quality metrics (reached,
 * ticks, rules…) merged over the current observation (base flags + the world
 * module's domain bag, so steps can reference `carryingPackage`,
 * `deliveredCount`, etc.). Metrics win on key collisions because `reached` /
 * `ticks` describe the run outcome, which is what steps most often check.
 */
export function liveContext(sim: Simulation, brain: VisualBrain): EvalContext {
  const observation = contextFromObservation(buildObservation(sim.world));
  const metrics = metricsToContext(metricsFromSim(sim, brain));
  return { ...observation, ...metrics };
}

export interface StepResult {
  id: string;
  label: string;
  hint?: string;
  /** True once the step's check holds. Steps with no check are never "done". */
  done: boolean;
  /** True when the step has no machine check (informational guidance only). */
  informational: boolean;
}

/**
 * Evaluate a task checklist against a context (typically `liveContext`). A step
 * whose check fails or throws simply reads as not-yet-done — the flow never
 * errors out mid-run over a malformed authoring expression.
 */
export function evaluateSteps(
  steps: TaskStep[],
  ctx: EvalContext,
): StepResult[] {
  return steps.map((s) => {
    if (!s.check || !s.check.trim()) {
      return { id: s.id, label: s.label, hint: s.hint, done: false, informational: true };
    }
    let done = false;
    try {
      done = evaluateCondition(s.check, ctx);
    } catch {
      done = false;
    }
    return { id: s.id, label: s.label, hint: s.hint, done, informational: false };
  });
}
