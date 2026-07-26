/**
 * Registry of swappable worlds and brains, loaded from the data files.
 *
 * This is the app's demonstration of the core milestone claim: the engine is
 * generic, and changing the world or the brain is a matter of picking different
 * data — no engine code changes. Each entry is just the parsed JSON files.
 */

import { BrainSource, WorldSource } from "@/lib/engine/simulation";
import { EntitiesData, WorldData } from "@/lib/engine/types";

import maze from "@/content/worlds/maze.json";
import mazeRooms from "@/content/worlds/maze-rooms.json";
import mazeProper from "@/content/worlds/maze-proper.json";
import challengeStraight from "@/content/worlds/challenge-straight.json";
import challengeCorner from "@/content/worlds/challenge-corner.json";
import challengeArena from "@/content/worlds/challenge-arena.json";
import warehouseFirstDelivery from "@/content/worlds/warehouse-first-delivery.json";
import warehousePackageSorting from "@/content/worlds/warehouse-package-sorting.json";
import warehouseContinuousOperations from "@/content/worlds/warehouse-continuous-operations.json";
import warehouseEnergyManagement from "@/content/worlds/warehouse-energy-management.json";
import financeBasicRoute from "@/content/worlds/finance-basic-route.json";
import financeSkipOffline from "@/content/worlds/finance-skip-offline.json";
import financeReliabilityIntro from "@/content/worlds/finance-reliability-intro.json";
import financeRouteSelection from "@/content/worlds/finance-route-selection.json";
import financeCostAndReliability from "@/content/worlds/finance-cost-and-reliability.json";
import financeProviderHealth from "@/content/worlds/finance-provider-health.json";
import financeInterviewRouting from "@/content/worlds/finance-interview-routing.json";
import financePeakHourSwitch from "@/content/worlds/finance-peak-hour-switch.json";
import financeProductionOrchestrator from "@/content/worlds/finance-production-orchestrator.json";
import parkingFirstShift from "@/content/worlds/parking-first-shift.json";
import parkingMatchVehicle from "@/content/worlds/parking-match-vehicle.json";
import parkingPriorityAccess from "@/content/worlds/parking-priority-access.json";
import parkingInterviewController from "@/content/worlds/parking-interview-controller.json";
import parkingInterviewOperations from "@/content/worlds/parking-interview-operations.json";
import parkingInterviewDistributed from "@/content/worlds/parking-interview-distributed.json";
import entities from "@/content/worlds/entities.json";

import goals from "@/content/brains/default/goals.json";
import states from "@/content/brains/default/states.json";
import rules from "@/content/brains/default/rules.json";
import functions from "@/content/brains/default/functions.json";
import memory from "@/content/brains/default/memory.json";

import nGoals from "@/content/brains/naive/goals.json";
import nStates from "@/content/brains/naive/states.json";
import nRules from "@/content/brains/naive/rules.json";
import nFunctions from "@/content/brains/naive/functions.json";
import nMemory from "@/content/brains/naive/memory.json";

import dGoals from "@/content/brains/dash/goals.json";
import dStates from "@/content/brains/dash/states.json";
import dRules from "@/content/brains/dash/rules.json";
import dFunctions from "@/content/brains/dash/functions.json";
import dMemory from "@/content/brains/dash/memory.json";

import wGoals from "@/content/brains/warehouse/goals.json";
import wStates from "@/content/brains/warehouse/states.json";
import wRules from "@/content/brains/warehouse/rules.json";
import wFunctions from "@/content/brains/warehouse/functions.json";
import wMemory from "@/content/brains/warehouse/memory.json";

import fGoals from "@/content/brains/finance/goals.json";
import fStates from "@/content/brains/finance/states.json";
import fRules from "@/content/brains/finance/rules.json";
import fFunctions from "@/content/brains/finance/functions.json";
import fMemory from "@/content/brains/finance/memory.json";

import pGoals from "@/content/brains/parking/goals.json";
import pStates from "@/content/brains/parking/states.json";
import pRules from "@/content/brains/parking/rules.json";
import pFunctions from "@/content/brains/parking/functions.json";
import pMemory from "@/content/brains/parking/memory.json";

const sharedEntities = entities as EntitiesData;

export interface WorldOption {
  key: string;
  label: string;
  source: WorldSource;
}

export interface BrainOption {
  key: string;
  label: string;
  source: BrainSource;
}

export const WORLDS: WorldOption[] = [
  {
    key: "snake",
    label: "Snake Corridor (11×11)",
    source: { world: maze as WorldData, entities: sharedEntities },
  },
  {
    key: "small",
    label: "Small Snake (7×7)",
    source: { world: mazeRooms as WorldData, entities: sharedEntities },
  },
  {
    key: "maze-proper",
    label: "The Branching Maze (11×11)",
    source: { world: mazeProper as WorldData, entities: sharedEntities },
  },
  {
    key: "challenge-straight",
    label: "Straight Corridor (7×3)",
    source: { world: challengeStraight as WorldData, entities: sharedEntities },
  },
  {
    key: "challenge-corner",
    label: "Corner Turn (5×5)",
    source: { world: challengeCorner as WorldData, entities: sharedEntities },
  },
  {
    key: "challenge-arena",
    label: "Open Arena (9×9)",
    source: { world: challengeArena as WorldData, entities: sharedEntities },
  },
  {
    key: "warehouse-first-delivery",
    label: "Warehouse Practice — First Delivery",
    source: { world: warehouseFirstDelivery as WorldData, entities: sharedEntities },
  },
  {
    key: "warehouse-package-sorting",
    label: "Warehouse Practice — Package Sorting (11×5)",
    source: { world: warehousePackageSorting as WorldData, entities: sharedEntities },
  },
  {
    key: "warehouse-continuous-operations",
    label: "Warehouse Easy — Continuous Operations (11×5)",
    source: { world: warehouseContinuousOperations as WorldData, entities: sharedEntities },
  },
  {
    key: "warehouse-energy-management",
    label: "Warehouse Medium — Energy Management (11×5)",
    source: { world: warehouseEnergyManagement as WorldData, entities: sharedEntities },
  },
  {
    key: "finance-basic-route",
    label: "Finance Tutorial — Route the Payment",
    source: { world: financeBasicRoute as WorldData, entities: sharedEntities },
  },
  {
    key: "finance-skip-offline",
    label: "Finance Tutorial — Mind the Offline Provider",
    source: { world: financeSkipOffline as WorldData, entities: sharedEntities },
  },
  {
    key: "finance-reliability-intro",
    label: "Finance Tutorial — Cheap Can Cost More",
    source: { world: financeReliabilityIntro as WorldData, entities: sharedEntities },
  },
  {
    key: "finance-route-selection",
    label: "Finance Easy — Three-Provider Routing",
    source: { world: financeRouteSelection as WorldData, entities: sharedEntities },
  },
  {
    key: "finance-cost-and-reliability",
    label: "Finance Easy — Cost and Reliability",
    source: { world: financeCostAndReliability as WorldData, entities: sharedEntities },
  },
  {
    key: "finance-provider-health",
    label: "Finance Medium — Real-Time Provider Health",
    source: { world: financeProviderHealth as WorldData, entities: sharedEntities },
  },
  {
    key: "finance-interview-routing",
    label: "Finance Interview — Intelligent Payment Routing",
    source: { world: financeInterviewRouting as WorldData, entities: sharedEntities },
  },
  {
    key: "finance-peak-hour-switch",
    label: "Finance Interview — Peak Hour Payment Switch",
    source: { world: financePeakHourSwitch as WorldData, entities: sharedEntities },
  },
  {
    key: "finance-production-orchestrator",
    label: "Finance Interview — Production Payment Orchestrator",
    source: { world: financeProductionOrchestrator as WorldData, entities: sharedEntities },
  },
  {
    key: "parking-first-shift",
    label: "Parking Tutorial — First Shift",
    source: { world: parkingFirstShift as WorldData, entities: sharedEntities },
  },
  {
    key: "parking-match-vehicle",
    label: "Parking Easy — Match the Vehicle",
    source: { world: parkingMatchVehicle as WorldData, entities: sharedEntities },
  },
  {
    key: "parking-priority-access",
    label: "Parking Easy — Priority Access",
    source: { world: parkingPriorityAccess as WorldData, entities: sharedEntities },
  },
  {
    key: "parking-interview-controller",
    label: "Parking Interview — Smart Parking Controller",
    source: { world: parkingInterviewController as WorldData, entities: sharedEntities },
  },
  {
    key: "parking-interview-operations",
    label: "Parking Interview — Autonomous Parking Operations",
    source: { world: parkingInterviewOperations as WorldData, entities: sharedEntities },
  },
  {
    key: "parking-interview-distributed",
    label: "Parking Interview — Production Parking Orchestrator",
    source: { world: parkingInterviewDistributed as WorldData, entities: sharedEntities },
  },
];

export const BRAINS: BrainOption[] = [
  {
    key: "follower",
    label: "Corridor Follower (solves it)",
    source: { goals, states, rules, functions, memory } as BrainSource,
  },
  {
    key: "dash",
    label: "Dash Explorer (multi-step bricks)",
    source: {
      goals: dGoals,
      states: dStates,
      rules: dRules,
      functions: dFunctions,
      memory: dMemory,
    } as BrainSource,
  },
  {
    key: "naive",
    label: "Naive Walker (gets stuck)",
    source: {
      goals: nGoals,
      states: nStates,
      rules: nRules,
      functions: nFunctions,
      memory: nMemory,
    } as BrainSource,
  },
  {
    key: "warehouse-practice",
    label: "Warehouse Operator (delivers order)",
    source: {
      goals: wGoals,
      states: wStates,
      rules: wRules,
      functions: wFunctions,
      memory: wMemory,
    } as BrainSource,
  },
  {
    key: "finance-router",
    label: "Payment Router (best value)",
    source: {
      goals: fGoals,
      states: fStates,
      rules: fRules,
      functions: fFunctions,
      memory: fMemory,
    } as BrainSource,
  },
  {
    key: "parking-operator",
    label: "Smart Parking Operator (matches every vehicle)",
    source: {
      goals: pGoals,
      states: pStates,
      rules: pRules,
      functions: pFunctions,
      memory: pMemory,
    } as BrainSource,
  },
];

export function findWorld(key: string): WorldOption {
  return WORLDS.find((w) => w.key === key) ?? WORLDS[0];
}

export function findBrain(key: string): BrainOption {
  return BRAINS.find((b) => b.key === key) ?? BRAINS[0];
}
