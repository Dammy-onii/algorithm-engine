/**
 * Browser-side compiler for the optional Code mode.
 *
 * The source is plain JavaScript and must return a controller instance. It is
 * intentionally kept out of the content registry and is evaluated only after a
 * learner explicitly presses Apply & Run or Submit solution. Demo submission
 * uses it inside a browser worker. Authoritative hosted interview execution
 * should run this contract in an isolated server worker/container.
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

// --- Starter skeletons ------------------------------------------------------
// Minimal boilerplate the Code tab opens with: the class, the required
// decide(observation) method, and a safe default return. Not a solution — just
// the base a learner needs to start writing their own logic.

export const MAZE_CONTROLLER_STARTER = `class Robot {
  // decide() runs once every tick. Return one action string.
  decide(observation) {
    // Read facts like observation.wallAhead, observation.wallRight, observation.atGoal.
    // Your logic here.
    return "wait";
  }
}

return new Robot();`;

export const FINANCE_CONTROLLER_STARTER = `class PaymentRouter {
  decide(observation) {
    const facts = observation.domain; // e.g. facts.onlineA, facts.feeA
    // Your logic here.
    return "hold";
  }
}

return new PaymentRouter();`;

export const PARKING_CONTROLLER_STARTER = `class ParkingController {
  decide(observation) {
    const facts = observation.domain; // e.g. facts.hasWaitingVehicle
    // Your logic here.
    return "wait";
  }
}

return new ParkingController();`;

export const DRONE_CONTROLLER_STARTER = `class SurveillanceDrone {
  constructor() {
    // Instance fields persist between ticks, so you can build your own map of
    // the search area and plan against it instead of reacting tick by tick.
    this.seen = new Set();
  }

  decide(observation) {
    const facts = observation.domain; // e.g. facts.targetDetected, facts.searchEast
    this.seen.add(observation.position.x + "," + observation.position.y);

    if (facts.atTarget) return "report";
    // Your search and tracking logic here.
    return "wait";
  }
}

return new SurveillanceDrone();`;

export const CARGO_CONTROLLER_STARTER = `class CargoDrone {
  constructor() {
    // The whole manifest is on observation.domain: obj0Weight, obj0Value,
    // obj0Col, obj0Row, obj0Active, ... for every crate. Plan against it.
    this.plan = null;
  }
  reset() { this.plan = null; }

  decide(observation) {
    const f = observation.domain;

    // In Code mode you can run your own knapsack over the manifest and route it
    // yourself with the cardinal moves, or call runKnapsack + planRoute and fly
    // the result with flyToPlanTarget. Nothing picks a crate for you.
    //
    // 1. Choose the crates to recover (a knapsack over weight/value).
    // 2. Route through them, pickUp on each, then flyToDepot and dropOff.
    // 3. The battery drains faster the more you carry, so recharge on the
    //    depot between trips. The mission ends when sectorClear is true —
    //    every crate home — not when the value target is met.

    if (f.atDepot && f.carriedCount > 0) return "dropOff";
    if (f.atDepot && !f.sectorClear && f.battery < 120) return "recharge";
    if (f.canPickHere) return "pickUp";
    if (f.sectorClear || !f.anyFits) return "flyToDepot";

    // Nothing chooses a crate for you. Either steer with moveNorth/East/South/
    // West toward a target you picked, or call runKnapsack + planRoute and let
    // flyToPlanTarget follow the plan.
    return "wait";
  }
}

return new CargoDrone();`;

export function compileController(source: string): AgentController {
  if (!source.trim()) throw new Error("Write a controller class before running Code mode.");
  let value: unknown;
  try {
    // Deliberately browser-only. Apply & Run uses the page and Demo submission
    // uses a Web Worker; a production multi-user runner must isolate this same
    // contract on trusted infrastructure.
    value = new Function(`"use strict";\n${source}`)();
  } catch (error) {
    throw new Error(`Controller code could not run: ${error instanceof Error ? error.message : String(error)}`);
  }
  assertAgentController(value);
  return value;
}
