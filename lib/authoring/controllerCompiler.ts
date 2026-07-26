/**
 * Browser-side compiler for the optional Code mode.
 *
 * The source is plain JavaScript and must return a controller instance. It is
 * intentionally kept out of the content registry and is only evaluated after a
 * learner explicitly presses Apply & Run. Hosted/interview execution should run
 * this contract in an isolated worker/container; this local Studio compiler is
 * the development authoring surface.
 */

import { assertAgentController, type AgentController } from "@/lib/engine/controller";

export const MAZE_CONTROLLER_TEMPLATE = `class RightHandFollower {
  pendingTurnRights = 0;
  pendingMove = false;

  // This method runs once on every simulation tick.
  decide(observation) {
    if (observation.atGoal) return "wait";

    // Finish a turn-and-move sequence before choosing a new junction.
    if (this.pendingTurnRights > 0) {
      this.pendingTurnRights -= 1;
      return "turnRight";
    }
    if (this.pendingMove) {
      this.pendingMove = false;
      return "moveForward";
    }

    if (!observation.wallRight) {
      this.pendingMove = true;
      return "turnRight";
    }
    if (!observation.wallAhead) return "moveForward";
    if (!observation.wallLeft) {
      this.pendingMove = true;
      return "turnLeft";
    }

    // Dead end: turn twice, then move on the next two ticks.
    this.pendingTurnRights = 1;
    this.pendingMove = true;
    return "turnRight";
  }
}

return new RightHandFollower();`;

export const FINANCE_CONTROLLER_TEMPLATE = `class PaymentRouter {
  decide(observation) {
    const facts = observation.domain;
    if (!facts.hasTransaction) return "hold";

    const candidates = [
      {
        action: "routeToA",
        available: facts.canRouteA,
        cost: facts.expectedCostA,
        reliability: facts.successRateA,
        latency: facts.currentLatencyA,
      },
      {
        action: "routeToB",
        available: facts.canRouteB,
        cost: facts.expectedCostB,
        reliability: facts.successRateB,
        latency: facts.currentLatencyB,
      },
      {
        action: "routeToC",
        available: facts.canRouteC,
        cost: facts.expectedCostC,
        reliability: facts.successRateC,
        latency: facts.currentLatencyC,
      },
    ].filter((provider) => provider.available);

    if (candidates.length === 0) {
      return facts.deadlineRemaining > 1 ? "hold" : "decline";
    }

    // Urgent payments prefer reliability and latency; ordinary payments prefer
    // expected cost. No provider name is assumed to be permanently optimal.
    candidates.sort((left, right) =>
      facts.isPriority
        ? right.reliability - left.reliability ||
          left.latency - right.latency
        : left.cost - right.cost ||
          right.reliability - left.reliability
    );

    return candidates[0].action;
  }
}

return new PaymentRouter();`;

export function compileController(source: string): AgentController {
  if (!source.trim()) throw new Error("Write a controller class before running Code mode.");
  let value: unknown;
  try {
    // Deliberately local/client-only. The Studio has no server-side evaluation
    // path; a production multi-user runner must isolate this same contract.
    value = new Function(`"use strict";\n${source}`)();
  } catch (error) {
    throw new Error(`Controller code could not run: ${error instanceof Error ? error.message : String(error)}`);
  }
  assertAgentController(value);
  return value;
}
