/**
 * Brain Compiler — VisualBrain → BrainSource.
 *
 * This is the bridge from the visual editor to the simulation engine.
 * The engine is completely unchanged: this function simply serialises
 * the visual model into the exact same five-layer JSON format the
 * engine has consumed since Milestone 1.
 *
 * Called by: the "Run" button in the Studio UI.
 */

import { VisualBrain, VisualCondition, ConditionAtom } from "./types";
import { BrainSource } from "@/lib/engine/simulation";
import { ActionType } from "@/lib/engine/types";

// ---------------------------------------------------------------------------
// Condition compilation
// ---------------------------------------------------------------------------

function atomToString(atom: ConditionAtom): string {
  if (atom.comparison) {
    return `${atom.flag} ${atom.comparison.op} ${atom.comparison.value}`;
  }
  return atom.negated ? `!${atom.flag}` : atom.flag;
}

export function compileCondition(cond: VisualCondition): string {
  if (cond.mode === "raw") return cond.expr.trim() || "always";

  const { atoms, operator } = cond.group;
  if (atoms.length === 0) return "always";
  if (atoms.length === 1) return atomToString(atoms[0]);
  return atoms.map(atomToString).join(` ${operator} `);
}

// ---------------------------------------------------------------------------
// Brain compilation
// ---------------------------------------------------------------------------

export function compileBrain(visual: VisualBrain): BrainSource {
  return {
    goals: {
      goals: visual.goals.map((g) => ({
        id: g.id,
        priority: g.priority,
        ...(g.description ? { description: g.description } : {}),
        ...(g.activeWhen ? { activeWhen: g.activeWhen } : {}),
      })),
    },

    states: {
      initial: visual.initial,
      states: visual.states.map((s) => ({
        id: s.id,
        ...(s.description ? { description: s.description } : {}),
      })),
    },

    rules: {
      rules: visual.rules.map((r) => ({
        id: r.id,
        ...(r.state !== null ? { state: r.state } : {}),
        when: compileCondition(r.condition),
        do: r.functionId,
        ...(r.setState !== null ? { setState: r.setState } : {}),
        ...(r.description ? { description: r.description } : {}),
      })),
    },

    functions: {
      functions: visual.functions.map((f) => ({
        id: f.id,
        ...(f.action !== undefined ? { action: f.action as ActionType } : {}),
        ...(f.steps !== undefined ? { steps: f.steps } : {}),
        ...(f.description ? { description: f.description } : {}),
      })),
    },

    conditions: {
      conditions: (visual.derived ?? [])
        .filter((c) => c.id.trim() && c.expr.trim())
        .map((c) => ({
          id: c.id.trim(),
          expr: c.expr.trim(),
          ...(c.description ? { description: c.description } : {}),
        })),
    },

    memory: visual.memory,
  };
}

// ---------------------------------------------------------------------------
// JSON preview helper (for the "Show Brain JSON" toggle in the UI)
// ---------------------------------------------------------------------------

/** Returns each brain layer serialised to a pretty-printed JSON string. */
export function compileBrainToTexts(visual: VisualBrain): Record<string, string> {
  const src = compileBrain(visual);
  return {
    goals: JSON.stringify(src.goals, null, 2),
    states: JSON.stringify(src.states, null, 2),
    rules: JSON.stringify(src.rules, null, 2),
    functions: JSON.stringify(src.functions, null, 2),
    conditions: JSON.stringify(src.conditions, null, 2),
    memory: JSON.stringify(src.memory, null, 2),
  };
}
