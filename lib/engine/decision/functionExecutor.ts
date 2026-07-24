/**
 * Function layer — answers "how does it actually happen?".
 *
 * A fired rule names a function; that function was compiled at load time into a
 * flat plan of primitive actions (see runtime/loader.ts). A single-step brick
 * yields a 1-action plan; a multi-step brick yields several. The simulation
 * runs the returned plan one action per tick.
 */

import { ActionType, Brain } from "../types";

export function planForFunction(brain: Brain, functionId: string): ActionType[] {
  const plan = brain.functionPlans[functionId];
  if (!plan) {
    throw new Error(`Rule referenced unknown function '${functionId}'`);
  }
  return plan;
}
