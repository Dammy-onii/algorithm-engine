"use client";

/**
 * RuleBuilder — visual editor for the Rules layer.
 *
 * The primary editing surface in the Studio. Each rule is a card with:
 *   - State selector (in which mode does this rule apply?)
 *   - Condition row (chips for flag conditions, joined by AND or OR)
 *   - Brick picker (which function does the robot execute?)
 *   - Optional setState transition
 *   - Explicit top-to-bottom execution order
 *
 * Rules are rendered in their authored order: the top card is checked first.
 */

import { useState } from "react";
import { VisualRule, VisualRuleFolder, VisualState, VisualFunction, VisualCondition, ConditionAtom, ConditionGuided, LogicalOp } from "@/lib/authoring/types";
import { ConditionChip } from "../blocks/ConditionChip";

const FIELD = "rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

// ---------------------------------------------------------------------------
// ConditionEditor sub-component — typed per mode, avoids union narrowing issues
// ---------------------------------------------------------------------------
interface ConditionEditorProps {
  condition: VisualCondition;
  availableConditions: string[];
  onAtomAdd: () => void;
  onAtomUpdate: (i: number, atom: ConditionAtom) => void;
  onAtomRemove: (i: number) => void;
  onToggleOperator: () => void;
  onSwitchToRaw: () => void;
  onConditionChange: (cond: VisualCondition) => void;
}

function ConditionEditor({ condition, availableConditions, onAtomAdd, onAtomUpdate, onAtomRemove, onToggleOperator, onSwitchToRaw, onConditionChange }: ConditionEditorProps) {
  if (condition.mode === "guided") {
    const guided: ConditionGuided = condition;
    return (
      <>
        {guided.group.atoms.map((atom, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <button
                onClick={onToggleOperator}
                className="rounded bg-zinc-100 px-1 font-mono text-xs font-semibold text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800"
                title="Toggle AND/OR"
              >
                {guided.group.operator}
              </button>
            )}
            <ConditionChip
              atom={atom}
              availableFlags={availableConditions}
              onChange={(updated) => onAtomUpdate(i, updated)}
              onRemove={() => onAtomRemove(i)}
            />
          </span>
        ))}
        <button
          onClick={onAtomAdd}
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          + condition
        </button>
        <button
          onClick={onSwitchToRaw}
          className="ml-auto text-zinc-300 hover:text-zinc-500 text-xs"
          title="Switch to raw expression mode"
        >
          raw
        </button>
      </>
    );
  }

  // Raw mode
  const raw = condition;
  return (
    <>
      <input
        className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800"
        value={raw.expr}
        placeholder="condition expression"
        list="ae-rule-conditions"
        onChange={(e) => onConditionChange({ mode: "raw", expr: e.target.value })}
      />
      <datalist id="ae-rule-conditions">
        {availableConditions.map((flag) => (
          <option key={flag} value={flag} />
        ))}
      </datalist>
      <button
        onClick={() => onConditionChange({ mode: "guided", group: { operator: "&&", atoms: [{ flag: "always", negated: false }] } })}
        className="text-xs text-zinc-400 hover:text-zinc-600"
        title="Switch to guided mode"
      >
        guided
      </button>
    </>
  );
}


interface Props {
  rules: VisualRule[];
  folders: VisualRuleFolder[];
  states: VisualState[];
  functions: VisualFunction[];
  availableBricks: string[];
  availableConditions: string[];
  /** Accepts a value or an updater — appends must use the updater form so two
   *  quick clicks on "Add rule" don't compute from the same stale array. */
  onChange: (rules: VisualRule[] | ((prev: VisualRule[]) => VisualRule[])) => void;
  /** Folders are editor metadata: they organise cards but never change execution. */
  onFoldersChange: (folders: VisualRuleFolder[]) => void;
}

function makeDefaultCondition(): VisualCondition {
  return { mode: "guided", group: { operator: "&&", atoms: [{ flag: "always", negated: false }] } };
}

function makeDefaultRule(states: VisualState[], functions: VisualFunction[], index: number): VisualRule {
  const firstFn = functions.find((f) => !f.isBuiltIn || functions.length === 1);
  return {
    id: `rule-${index + 1}`,
    state: states[0]?.id ?? null,
    condition: makeDefaultCondition(),
    functionId: firstFn?.id ?? functions[0]?.id ?? "",
    setState: null,
    priority: 0, // retained only for old local drafts; the engine ignores it
    description: "",
  };
}

export function RuleBuilder({ rules, folders, states, functions, availableBricks, availableConditions, onChange, onFoldersChange }: Props) {
  // The array is the flowchart. Do not sort it: top-to-bottom is execution order.
  const ordered = rules;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const commitOrder = (next: VisualRule[]) => onChange(next);

  const update = (index: number, patch: Partial<VisualRule>) => {
    onChange(ordered.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const remove = (index: number) => onChange(ordered.filter((_, i) => i !== index));

  const addFolder = () => {
    const usedIds = new Set(folders.map((folder) => folder.id));
    let number = folders.length + 1;
    let id = `folder-${number}`;
    while (usedIds.has(id)) {
      number += 1;
      id = `folder-${number}`;
    }
    onFoldersChange([...folders, { id, name: `Folder ${number}` }]);
  };

  const renameFolder = (id: string, name: string) =>
    onFoldersChange(folders.map((folder) => (folder.id === id ? { ...folder, name } : folder)));

  const toggleFolder = (id: string) =>
    onFoldersChange(
      folders.map((folder) =>
        folder.id === id ? { ...folder, collapsed: !folder.collapsed } : folder
      )
    );

  const removeFolder = (id: string) => {
    // A folder is organisational only. Removing it never deletes its rules;
    // those cards simply become unfiled.
    onChange(rules.map((rule) => (rule.folderId === id ? { ...rule, folderId: undefined } : rule)));
    onFoldersChange(folders.filter((folder) => folder.id !== id));
  };

  const add = () => {
    // Functional updater so rapid double-clicks each prepend to the latest list.
    // A new rule starts at the top: it is the first branch to be evaluated.
    onChange((prev) => {
      return [makeDefaultRule(states, functions, prev.length), ...prev];
    });
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...ordered];
    const [rule] = next.splice(from, 1);
    next.splice(to, 0, rule);
    commitOrder(next);
  };

  const duplicate = (index: number) => {
    const source = ordered[index];
    const usedIds = new Set(ordered.map((rule) => rule.id));
    const baseId = `${source.id || "rule"}-copy`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    const next = [...ordered];
    next.splice(index + 1, 0, { ...source, id });
    commitOrder(next);
  };

  // Condition helpers use the currently displayed flow order.
  const updateCondition = (index: number, cond: VisualCondition) =>
    update(index, { condition: cond });

  const addAtom = (rule: VisualRule, index: number) => {
    if (rule.condition.mode === "raw") return;
    const atom: ConditionAtom = { flag: availableConditions[0] ?? "always", negated: false };
    update(index, {
      condition: {
        mode: "guided",
        group: { operator: rule.condition.group.operator, atoms: [...rule.condition.group.atoms, atom] },
      },
    });
  };

  const updateAtom = (rule: VisualRule, index: number, atomIndex: number, updated: ConditionAtom) => {
    if (rule.condition.mode === "raw") return;
    const atoms = rule.condition.group.atoms.map((a, i) => (i === atomIndex ? updated : a));
    update(index, { condition: { mode: "guided", group: { ...rule.condition.group, atoms } } });
  };

  const removeAtom = (rule: VisualRule, index: number, atomIndex: number) => {
    if (rule.condition.mode === "raw") return;
    const atoms = rule.condition.group.atoms.filter((_, i) => i !== atomIndex);
    update(index, {
      condition: { mode: "guided", group: { ...rule.condition.group, atoms } },
    });
  };

  const toggleOperator = (rule: VisualRule, index: number) => {
    if (rule.condition.mode === "raw") return;
    const op: LogicalOp = rule.condition.group.operator === "&&" ? "||" : "&&";
    update(index, { condition: { mode: "guided", group: { ...rule.condition.group, operator: op } } });
  };

  const switchToRaw = (rule: VisualRule, index: number) => {
    if (rule.condition.mode === "guided") {
      const atoms = rule.condition.group.atoms;
      const expr =
        atoms.length === 0
          ? "always"
          : atoms
              .map((a) => (a.comparison ? `${a.flag} ${a.comparison.op} ${a.comparison.value}` : a.negated ? `!${a.flag}` : a.flag))
              .join(` ${rule.condition.group.operator} `);
      updateCondition(index, { mode: "raw", expr });
    }
  };

  // Palette: bricks visible in this challenge + all user-composed functions
  const palette = functions.filter(
    (f) => availableBricks.includes(f.id) || !f.isBuiltIn
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">
          How a rule works
        </p>
        <p>
          Every tick the robot looks at its surroundings and picks{" "}
          <em>one</em> rule to run. A rule reads:
        </p>
        <p className="my-1.5 font-mono text-zinc-700 dark:text-zinc-300">
          WHEN &lt;what the robot senses&gt; → DO &lt;which action to run&gt;
        </p>
        <p>
          <strong className="font-semibold text-zinc-700 dark:text-zinc-300">WHEN</strong> is
          the condition — a fact about what the robot can sense{" "}
          <em>right now</em>, like &quot;there is a wall directly ahead&quot;. If it is
          true, the rule is allowed to fire.{" "}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-300">DO</strong> is
          the action it performs.
        </p>
        <p className="mt-1.5">
          The engine checks cards from <strong>top to bottom</strong>. The first card
          whose WHEN condition is true and whose next action is safe runs; the rest
          are not checked that tick. Drag cards or use the arrows to change that flow.
        </p>
      </div>

      <section className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Rule folders">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Rule folders</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Categorise cards without changing their global execution order.
            </p>
          </div>
          <button
            onClick={addFolder}
            className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
          >
            + Folder
          </button>
        </div>

        {folders.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {folders.map((folder) => {
              const count = rules.filter((rule) => rule.folderId === folder.id).length;
              return (
                <div key={folder.id} className="flex items-center gap-2">
                  <input
                    className={`${FIELD} min-w-0 flex-1 text-xs`}
                    aria-label={`Name for ${folder.name || "rule folder"}`}
                    value={folder.name}
                    placeholder="Folder name"
                    onChange={(event) => renameFolder(folder.id, event.target.value)}
                  />
                  <span className="shrink-0 text-xs text-zinc-400">{count} {count === 1 ? "rule" : "rules"}</span>
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="shrink-0 text-xs text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                    title={folder.collapsed ? "Show this folder's rules" : "Hide this folder's rules"}
                  >
                    {folder.collapsed ? "Expand" : "Collapse"}
                  </button>
                  <button
                    onClick={() => removeFolder(folder.id)}
                    className="text-xs text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                    title="Remove folder and leave its rules unfiled"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {folders.some((folder) => folder.collapsed) && (
          <p className="mt-2 text-xs text-zinc-500">
            Collapsed folders hide their cards only; their rules keep the same order and still run.
          </p>
        )}
      </section>

      {ordered.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
          No rules yet. The robot will wait forever without at least one rule.
        </div>
      )}

      {ordered.map((rule, index) => {
        const folder = rule.folderId ? folders.find((item) => item.id === rule.folderId) : undefined;
        // Keep the global `ordered` list intact. A collapsed folder only hides
        // its cards; it never filters, renumbers, or otherwise changes rules.
        if (folder?.collapsed) return null;

        return (
        <div
          key={index}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragEnd={() => setDragIndex(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (dragIndex !== null) move(dragIndex, index);
            setDragIndex(null);
          }}
          className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {/* Header row */}
          <div className="flex items-center gap-2">
            <span className="cursor-grab select-none text-zinc-400 active:cursor-grabbing" title="Drag to change execution order">⋮⋮</span>
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-200 font-mono text-xs text-zinc-500 dark:border-zinc-700"
              title="Execution order: the first matching rule runs"
              aria-label={`Execution order ${index + 1}`}
            >
              {index + 1}
            </span>
            <input
              className={`${FIELD} flex-1 font-mono text-xs`}
              placeholder="rule-id"
              value={rule.id}
              onChange={(e) => update(index, { id: e.target.value })}
            />
            <div className="flex items-center gap-0.5" aria-label="Rule ordering controls">
              <button
                onClick={() => move(index, 0)}
                disabled={index === 0}
                className="rounded px-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="Bring rule to the top"
                aria-label="Bring rule to the top"
              >
                ⇈
              </button>
              <button
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                className="rounded px-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="Move rule up"
                aria-label="Move rule up"
              >
                ↑
              </button>
              <button
                onClick={() => move(index, index + 1)}
                disabled={index === ordered.length - 1}
                className="rounded px-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="Move rule down"
                aria-label="Move rule down"
              >
                ↓
              </button>
              <button
                onClick={() => move(index, ordered.length - 1)}
                disabled={index === ordered.length - 1}
                className="rounded px-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="Send rule to the bottom"
                aria-label="Send rule to the bottom"
              >
                ⇊
              </button>
            </div>
            <button
              onClick={() => duplicate(index)}
              className="rounded px-1.5 py-0.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Duplicate rule"
            >
              Duplicate
            </button>
            <button
              onClick={() => remove(index)}
              className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Remove rule"
            >
              ×
            </button>
          </div>

          {/* State filter */}
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="shrink-0">Folder</span>
            <select
              className={`${FIELD} min-w-0 flex-1 text-xs`}
              value={rule.folderId ?? ""}
              onChange={(event) => update(index, { folderId: event.target.value || undefined })}
            >
              <option value="">Unfiled</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name || "Untitled folder"}</option>
              ))}
            </select>
          </div>

          {states.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="shrink-0">In state</span>
              <select
                className={`${FIELD} text-xs`}
                value={rule.state ?? "__any__"}
                onChange={(e) =>
                  update(index, { state: e.target.value === "__any__" ? null : e.target.value })
                }
              >
                <option value="__any__">any state</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </select>
            </div>
          )}

          {/* Condition row */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1 text-xs text-zinc-500">
              <span
                className="shrink-0 font-semibold text-zinc-700 dark:text-zinc-300"
                title="The situation that must be true for this rule to fire"
              >
                WHEN
              </span>
              <ConditionEditor
                condition={rule.condition}
                availableConditions={availableConditions}
                onAtomAdd={() => addAtom(rule, index)}
                onAtomUpdate={(i, atom) => updateAtom(rule, index, i, atom)}
                onAtomRemove={(i) => removeAtom(rule, index, i)}
                onToggleOperator={() => toggleOperator(rule, index)}
                onSwitchToRaw={() => switchToRaw(rule, index)}
                onConditionChange={(cond) => updateCondition(index, cond)}
              />
            </div>
          </div>

          {/* Brick picker */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span
              className="shrink-0 font-semibold text-zinc-700 dark:text-zinc-300"
              title="The action the robot performs when this rule fires"
            >
              DO
            </span>
            <div className="flex flex-wrap gap-1">
              {palette.map((fn) => (
                <button
                  key={fn.id}
                  onClick={() => update(index, { functionId: fn.id })}
                  className={[
                    "rounded px-2 py-1 font-mono text-xs font-medium transition-colors",
                    rule.functionId === fn.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : fn.isBuiltIn
                        ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        : "border border-zinc-400 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300",
                  ].join(" ")}
                  title={fn.isBuiltIn ? fn.description : `Your function: ${fn.description || fn.id}`}
                >
                  {fn.id}
                </button>
              ))}
            </div>
          </div>

          {/* State transition */}
          {states.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="shrink-0">Then switch to</span>
              <select
                className={`${FIELD} text-xs`}
                value={rule.setState ?? "__none__"}
                onChange={(e) =>
                  update(index, { setState: e.target.value === "__none__" ? null : e.target.value })
                }
              >
                <option value="__none__">— no transition —</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        );
      })}

      <button
        onClick={add}
        className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors dark:border-zinc-700 dark:hover:border-zinc-500"
      >
        + Add rule
      </button>
    </div>
  );
}
