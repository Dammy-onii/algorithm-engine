/**
 * The Simulation ties everything together and exposes the heartbeat of the
 * engine: `tick()`.
 *
 * Each tick runs the fixed lifecycle from the design doc:
 *   Read World → Generate Observation → Evaluate Goal → Determine State
 *   → Evaluate Rules → Execute Function → Return Action → Update World → Snapshot
 *
 * The engine is generic: swap the World data or the Brain data and this loop is
 * unchanged. That invariance is the whole point of Milestone 1.
 */

import {
  Brain,
  ActionType,
  EntitiesData,
  SimStatus,
  SimStep,
  WorldData,
} from "./types";
import { buildBrain, buildWorld } from "./runtime/loader";
import { buildObservation } from "./decision/observation";
import { resolveAction } from "./decision/actionResolver";
import { World } from "./world/world";
import {
  ConditionsData,
  GoalsData,
  StatesData,
  RulesData,
  FunctionsData,
  MemoryData,
} from "./types";

export interface WorldSource {
  world: WorldData;
  entities: EntitiesData;
}

export interface BrainSource {
  goals: GoalsData;
  states: StatesData;
  rules: RulesData;
  functions: FunctionsData;
  memory: MemoryData;
  /** Optional 6th layer: user-defined named conditions (composable perception). */
  conditions?: ConditionsData;
}

export interface SimulationConfig {
  /** End the run as "stuck" after this many ticks with no newly visited tile. */
  stuckAfterIdleTicks?: number;
  /** Hard cap so a runaway sim can never loop forever. */
  maxTicks?: number;
  /**
   * Consecutive ticks the agent must remain on the goal before the run counts
   * as complete. Reaching the goal is not enough — it has to settle there.
   */
  goalHoldTicks?: number;
}

const DEFAULTS: Required<SimulationConfig> = {
  stuckAfterIdleTicks: 40,
  maxTicks: 2000,
  goalHoldTicks: 3,
};

export class Simulation {
  readonly brain: Brain;
  world: World;
  private lastStep: SimStep | null = null;
  private ticksSinceProgress = 0;
  private lastVisitedCount = 0;
  private readonly config: Required<SimulationConfig>;

  /**
   * A brick currently mid-execution. While set, its remaining plan runs one
   * action per tick and the rule engine is NOT re-evaluated — that is what lets
   * a multi-step brick behave as a single committed behavior.
   */
  private activeBrick: {
    goalId: string | null;
    stateId: string;
    ruleId: string | null;
    functionId: string | null;
    plan: ActionType[];
    cursor: number;
  } | null = null;

  private readonly worldSource: WorldSource;

  constructor(
    worldSource: WorldSource,
    brainSource: BrainSource,
    config: SimulationConfig = {},
  ) {
    this.config = { ...DEFAULTS, ...config };
    this.worldSource = worldSource;
    this.brain = buildBrain(
      brainSource.goals,
      brainSource.states,
      brainSource.rules,
      brainSource.functions,
      brainSource.memory,
      brainSource.conditions,
    );
    this.world = buildWorld(
      worldSource.world,
      worldSource.entities,
      this.brain,
      this.config.goalHoldTicks,
    );
    this.lastVisitedCount = this.world.agent.visited.size;
  }

  get status(): SimStatus {
    return this.world.status;
  }

  get isDone(): boolean {
    const s = this.world.status;
    return s === "reached" || s === "stuck" || s === "out-of-energy";
  }

  /** Current snapshot without advancing (e.g. to render the initial frame). */
  snapshot(): SimStep {
    if (this.lastStep) return this.lastStep;
    const observation = buildObservation(this.world);
    const decision = resolveAction(this.brain, observation, this.world.agent.state);
    const total = decision.plan.length;
    const step: SimStep = {
      tick: this.world.tick,
      status: this.world.status === "idle" ? "idle" : this.world.status,
      observation,
      trace: {
        goalId: decision.goalId,
        stateId: decision.stateId,
        ruleId: decision.ruleId,
        functionId: decision.functionId,
        action: { type: decision.plan[0] ?? "wait" },
        step: total > 1 ? { index: 0, total } : undefined,
      },
      memory: { ...this.world.agent.memory },
      goalHold: {
        current: this.world.ticksAtGoal,
        required: this.world.goalHoldTicks,
      },
    };
    this.lastStep = step;
    return step;
  }

  /** Advance the simulation by exactly one tick. Idempotent once done. */
  tick(): SimStep {
    if (this.isDone) return this.snapshot();

    // Observe (always, for the debug panel + fresh decisions).
    const observation = buildObservation(this.world);

    // Decide — but only when no brick is mid-execution. A running multi-step
    // brick is committed: it finishes its plan before the rules run again.
    if (!this.activeBrick) {
      const decision = resolveAction(
        this.brain,
        observation,
        this.world.agent.state,
      );
      // State transition happens as the brick starts.
      this.world.agent.state = decision.nextState;
      this.activeBrick = {
        goalId: decision.goalId,
        stateId: decision.stateId,
        ruleId: decision.ruleId,
        functionId: decision.functionId,
        plan: decision.plan,
        cursor: 0,
      };
    }

    // Act: run the current step of the active brick's plan.
    const brick = this.activeBrick;
    const actionType = brick.plan[brick.cursor] ?? "wait";
    this.world.apply({ type: actionType });

    const total = brick.plan.length;
    const stepInfo = { index: brick.cursor, total };
    brick.cursor += 1;
    const brickFinished = brick.cursor >= total;

    // Progress / stuck detection.
    if (this.world.agent.visited.size > this.lastVisitedCount) {
      this.lastVisitedCount = this.world.agent.visited.size;
      this.ticksSinceProgress = 0;
    } else {
      this.ticksSinceProgress += 1;
    }

    if (this.world.status === "running") {
      if (this.ticksSinceProgress >= this.config.stuckAfterIdleTicks) {
        this.world.status = "stuck";
      } else if (this.world.tick >= this.config.maxTicks) {
        this.world.status = "stuck";
      }
    }

    const step: SimStep = {
      tick: this.world.tick,
      status: this.world.status,
      observation,
      trace: {
        goalId: brick.goalId,
        stateId: brick.stateId,
        ruleId: brick.ruleId,
        functionId: brick.functionId,
        action: { type: actionType },
        step: total > 1 ? stepInfo : undefined,
      },
      memory: { ...this.world.agent.memory },
      goalHold: {
        current: this.world.ticksAtGoal,
        required: this.world.goalHoldTicks,
      },
    };

    if (brickFinished) this.activeBrick = null;

    this.lastStep = step;
    return step;
  }

  /** Rebuild the world from source, leaving the (immutable) brain intact. */
  reset(): void {
    this.world = buildWorld(
      this.worldSource.world,
      this.worldSource.entities,
      this.brain,
      this.config.goalHoldTicks,
    );
    this.lastStep = null;
    this.activeBrick = null;
    this.ticksSinceProgress = 0;
    this.lastVisitedCount = this.world.agent.visited.size;
  }
}
