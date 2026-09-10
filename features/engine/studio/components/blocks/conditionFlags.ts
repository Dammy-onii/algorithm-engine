import { allDomainFlagSpecs } from "@/lib/engine/worlds/registry";

export const DOMAIN_FLAGS = allDomainFlagSpecs();

export const BOOLEAN_FLAGS = [
  "wallAhead",
  "wallLeft",
  "wallRight",
  "goalVisible",
  "goalAhead",
  "atGoal",
  "visitedAhead",
  "always",
  "never",
] as const;

export const NUMERIC_FLAGS = ["energy", "visitedCount", "tick"] as const;

export const ALL_FLAGS = [
  ...BOOLEAN_FLAGS,
  ...NUMERIC_FLAGS,
  ...DOMAIN_FLAGS.map((flag) => flag.id),
] as const;

export const FLAG_LABELS: Record<string, string> = {
  wallAhead: "Wall Ahead",
  wallLeft: "Wall Left",
  wallRight: "Wall Right",
  goalVisible: "Goal Visible",
  goalAhead: "Goal Ahead",
  atGoal: "At Goal",
  visitedAhead: "Visited Ahead",
  always: "Always",
  never: "Never",
  energy: "Energy",
  visitedCount: "Visited Count",
  tick: "Tick",
  ...Object.fromEntries(DOMAIN_FLAGS.map((flag) => [flag.id, flag.label])),
};
