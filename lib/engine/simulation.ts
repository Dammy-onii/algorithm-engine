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
import {
  resolveAction,
  BASE_ACTION_PRECONDITIONS,
  isActionExecutable,
} from "./decision/actionResolver";
import { World } from "./world/world";
import type { AgentController } from "./controller";
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
  /** Optional OOP control surface. When present it replaces visual rule selection. */
  controller?: AgentController;
}

const DEFAULTS: Omit<Required<SimulationConfig>, "controller"> = {
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
  private readonly config: Omit<Required<SimulationConfig>, "controller"> & { controller?: AgentController };
  private readonly controller: AgentController | null;

  /**
   * A brick currently mid-execution. While set, its remaining plan runs one
   * action per tick. The next primitive is checked against a fresh observation
   * before it runs; an unsafe remainder is interrupted and rule flow resumes.
   */
  private activeBrick: {
    goalId: string | null;
    stateId: string;
    ruleId: string | null;
    functionId: string | null;
    condition: string | null;
    reason: string;
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
    this.controller = config.controller ?? null;
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

  /** Base movement + active module preconditions, for executable-rule selection. */
  private get actionPreconditions(): Readonly<Record<string, string>> {
    return { ...BASE_ACTION_PRECONDITIONS, ...(this.world.module.actionPreconditions ?? {}) };
  }

  get isDone(): boolean {
    const s = this.world.status;
    return s === "reached" || s === "stuck" || s === "out-of-energy";
  }

  private applyProgressAndLimits(): void {
    if (this.world.agent.visited.size > this.lastVisitedCount) {
      this.lastVisitedCount = this.world.agent.visited.size;
      this.ticksSinceProgress = 0;
    } else {
      this.ticksSinceProgress += 1;
    }

    if (this.world.status === "running") {
      const movementTracked = this.world.module.tracksMovement !== false;
      if (movementTracked && this.ticksSinceProgress >= this.config.stuckAfterIdleTicks) {
        this.world.status = "stuck";
      } else if (this.world.tick >= this.config.maxTicks) {
        this.world.status = "stuck";
      }
    }
  }

  /** Current snapshot without advancing (e.g. to render the initial frame). */
  snapshot(): SimStep {
    if (this.lastStep) return this.lastStep;
    if (this.controller) {
      const observation = buildObservation(this.world);
      const step: SimStep = {
        tick: this.world.tick,
        status: this.world.status,
        observation,
        trace: {
          goalId: null,
          stateId: "controller",
          ruleId: null,
          functionId: "controller",
          action: { type: "wait" },
          requestedAction: "wait",
          reason: "The Code Controller has not run yet.",
        },
        memory: { ...this.world.agent.memory },
        goalHold: { current: this.world.ticksAtGoal, required: this.world.goalHoldTicks },
      };
      this.lastStep = step;
      return step;
    }
    const observation = buildObservation(this.world);
    const decision = resolveAction(
      this.brain,
      observation,
      this.world.agent.state,
      this.actionPreconditions,
    );
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
        condition: decision.condition ?? undefined,
        reason: decision.reason,
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

    if (this.controller) {
      let actionType: ActionType;
      try {
        actionType = this.controller.decide(observation);
      } catch (error) {
        throw new Error(`Controller decide() failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      const availableActions = new Set(["moveForward", "turnLeft", "turnRight", "wait", ...this.world.module.domainActions]);
      if (typeof actionType !== "string" || !availableActions.has(actionType)) {
        throw new Error(`Controller returned unavailable action '${String(actionType)}'.`);
      }
      const safeAction = isActionExecutable(
        actionType,
        observation,
        this.actionPreconditions,
        this.brain.derivedConditions,
      )
        ? actionType
        : "wait";
      const actionWasSafe = safeAction === actionType;
      this.world.apply({ type: safeAction });
      this.applyProgressAndLimits();
      const step: SimStep = {
        tick: this.world.tick,
        status: this.world.status,
        observation,
        trace: {
          goalId: null,
          stateId: "controller",
          ruleId: null,
          functionId: "controller",
          action: { type: safeAction },
          requestedAction: actionType,
          reason: actionWasSafe
            ? "The Code Controller returned this action and its world precondition passed."
            : `The Code Controller returned '${actionType}', but its world precondition failed, so the engine executed 'wait'.`,
        },
        memory: { ...this.world.agent.memory },
        goalHold: { current: this.world.ticksAtGoal, required: this.world.goalHoldTicks },
      };
      this.lastStep = step;
      return step;
    }

    // A multi-step brick may continue only while its *next* primitive remains
    // safe in the fresh observation. This prevents a turn-and-step brick from
    // blindly walking into a wall after its earlier turn changed the situation.
    if (this.activeBrick) {
      const next = this.activeBrick.plan[this.activeBrick.cursor] ?? "wait";
      if (!isActionExecutable(next, observation, this.actionPreconditions, this.brain.derivedConditions)) {
        this.activeBrick = null;
      }
    }

    // Decide only at the start of a brick or after a safety interruption.
    if (!this.activeBrick) {
      const decision = resolveAction(
        this.brain,
        observation,
        this.world.agent.state,
        this.actionPreconditions,
      );
      // State transition happens as the brick starts.
      this.world.agent.state = decision.nextState;
      this.activeBrick = {
        goalId: decision.goalId,
        stateId: decision.stateId,
        ruleId: decision.ruleId,
        functionId: decision.functionId,
        condition: decision.condition,
        reason: decision.reason,
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

    this.applyProgressAndLimits();

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
        condition: brick.condition ?? undefined,
        reason:
          total > 1 && stepInfo.index > 0
            ? `Continuing step ${stepInfo.index + 1} of the previously selected '${brick.functionId ?? "function"}' plan.`
            : brick.reason,
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
    this.controller?.reset?.();
    this.ticksSinceProgress = 0;
    this.lastVisitedCount = this.world.agent.visited.size;
  }
}
