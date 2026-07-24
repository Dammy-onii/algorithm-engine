/**
 * Registry of swappable worlds and brains, loaded from the data files.
 *
 * This is the app's demonstration of the core milestone claim: the engine is
 * generic, and changing the world or the brain is a matter of picking different
 * data — no engine code changes. Each entry is just the parsed JSON files.
 */

import { BrainSource, WorldSource } from "@/lib/engine/simulation";
import { EntitiesData, WorldData } from "@/lib/engine/types";

import maze from "@/world/maze.json";
import mazeRooms from "@/world/maze-rooms.json";
import challengeStraight from "@/world/challenge-straight.json";
import challengeCorner from "@/world/challenge-corner.json";
import challengeArena from "@/world/challenge-arena.json";
import entities from "@/world/entities.json";

import goals from "@/brain/goals.json";
import states from "@/brain/states.json";
import rules from "@/brain/rules.json";
import functions from "@/brain/functions.json";
import memory from "@/brain/memory.json";

import nGoals from "@/brain-naive/goals.json";
import nStates from "@/brain-naive/states.json";
import nRules from "@/brain-naive/rules.json";
import nFunctions from "@/brain-naive/functions.json";
import nMemory from "@/brain-naive/memory.json";

import dGoals from "@/brain-dash/goals.json";
import dStates from "@/brain-dash/states.json";
import dRules from "@/brain-dash/rules.json";
import dFunctions from "@/brain-dash/functions.json";
import dMemory from "@/brain-dash/memory.json";

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
];

export function findWorld(key: string): WorldOption {
  return WORLDS.find((w) => w.key === key) ?? WORLDS[0];
}

export function findBrain(key: string): BrainOption {
  return BRAINS.find((b) => b.key === key) ?? BRAINS[0];
}
