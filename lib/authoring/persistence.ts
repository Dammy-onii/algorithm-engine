import { VisualBrain, VisualRule } from "./types";

function isAlways(condition: VisualRule["condition"]): boolean {
  if (condition.mode === "raw") return condition.expr.trim() === "always";
  const atoms = condition.group.atoms;
  return (
    atoms.length === 1 &&
    atoms[0].flag === "always" &&
    !atoms[0].negated &&
    !atoms[0].comparison
  );
}

/**
 * Forward-compatible persisted authoring state.
 *
 * Newly shipped primitive wrappers are merged from the current scaffold. A
 * terminal `always → hold` is removed because the engine's no-match behaviour
 * is already wait; keeping it would make newly bottom-appended rules unreachable.
 */
export function upgradePersistedBrain(
  saved: Partial<VisualBrain>,
  scaffold: VisualBrain,
): VisualBrain {
  const rules = [...(saved.rules ?? [])];
  const last = rules.at(-1);
  if (last && last.functionId === "hold" && isAlways(last.condition)) {
    rules.pop();
  }

  const savedFunctions = saved.functions ?? [];
  const knownFunctions = new Set(savedFunctions.map((fn) => fn.id));
  const newBuiltIns = scaffold.functions.filter(
    (fn) => fn.isBuiltIn && !knownFunctions.has(fn.id),
  );

  return {
    goals: saved.goals ?? scaffold.goals,
    initial:
      saved.initial ??
      saved.states?.[0]?.id ??
      scaffold.initial ??
      scaffold.states[0]?.id ??
      "start",
    states: saved.states ?? scaffold.states,
    rules,
    ruleFolders: saved.ruleFolders ?? [],
    functions: [...savedFunctions, ...newBuiltIns],
    derived: saved.derived ?? [],
    memory: saved.memory ?? {},
    controllerCode: saved.controllerCode,
  };
}
