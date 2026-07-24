/**
 * State layer — answers "what mode of operation am I in?".
 *
 * The agent is always in exactly one state. State transitions are data-driven:
 * a fired rule may carry a `setState`, applied by the action resolver. This
 * module resolves the currently active state and validates transitions.
 */

import { StateDef } from "../types";

export function resolveState(states: StateDef[], currentId: string): StateDef {
  const found = states.find((s) => s.id === currentId);
  if (!found) {
    throw new Error(
      `Active state '${currentId}' is not defined in states.json`,
    );
  }
  return found;
}

export function isValidState(states: StateDef[], id: string): boolean {
  return states.some((s) => s.id === id);
}
