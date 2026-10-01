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
import { VisualRule, VisualRuleFolder, VisualState, VisualFunction, VisualCondition, ConditionAtom, ConditionGroup, ConditionGuided, LogicalOp } from "@/lib/authoring/types";
import { compileCondition } from "@/lib/authoring/brainCompiler";
import { ConditionChip } from "../blocks/ConditionChip";
import { ConditionExpressionInput } from "./ConditionExpressionInput";

const FIELD = "rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

// ---------------------------------------------------------------------------
// ConditionEditor sub-component — typed per mode, avoids union narrowing issues
// ---------------------------------------------------------------------------
interface ConditionEditorProps {
  condition: VisualCondition;
  availableConditions: string[];
  onSwitchToRaw: () => void;
  onConditionChange: (cond: VisualCondition) => void;
}

function defaultAtom(availableConditions: string[]): ConditionAtom {
  return {
    flag: availableConditions.includes("always")
      ? "always"
      : availableConditions[0] ?? "always",
    negated: false,
  };
}

function oppositeOperator(operator: LogicalOp): LogicalOp {
  return operator === "&&" ? "||" : "&&";
}

function OperatorButton({
  operator,
  onClick,
}: {
  operator: LogicalOp;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded bg-zinc-100 px-1 font-mono text-xs font-semibold text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      title="Change the connectors inside this group"
    >
      {operator}
    </button>
  );
}

function GuidedConditionGroup({
  group,
  availableConditions,
  onChange,
  depth = 0,
}: {
  group: ConditionGroup;
  availableConditions: string[];
  onChange: (group: ConditionGroup) => void;
  depth?: number;
}) {
  const groups = group.groups ?? [];
  const toggleOperator = () =>
    onChange({ ...group, operator: oppositeOperator(group.operator) });
  const hasPrevious = (index: number) =>
    group.atoms.length > 0 || index > 0;

  return (
    <span className="contents">
      {group.atoms.map((atom, index) => (
        <span key={`atom-${index}`} className="flex items-center gap-1">
          {index > 0 && (
            <OperatorButton
              operator={group.operator}
              onClick={toggleOperator}
            />
          )}
          <ConditionChip
            atom={atom}
            availableFlags={availableConditions}
            onChange={(updated) =>
              onChange({
                ...group,
                atoms: group.atoms.map((candidate, atomIndex) =>
                  atomIndex === index ? updated : candidate,
                ),
              })
            }
            onRemove={() =>
              onChange({
                ...group,
                atoms: group.atoms.filter((_, atomIndex) => atomIndex !== index),
              })
            }
          />
        </span>
      ))}

      {groups.map((child, index) => (
        <span key={`group-${index}`} className="flex items-center gap-1">
          {hasPrevious(index) && (
            <OperatorButton
              operator={group.operator}
              onClick={toggleOperator}
            />
          )}
          <span className="flex flex-wrap items-center gap-1 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-1.5 py-1 dark:border-zinc-600 dark:bg-zinc-800/60">
            <span className="font-mono text-zinc-400">(</span>
            <GuidedConditionGroup
              group={child}
              availableConditions={availableConditions}
              depth={depth + 1}
              onChange={(updated) =>
                onChange({
                  ...group,
                  groups: groups.map((candidate, groupIndex) =>
                    groupIndex === index ? updated : candidate,
                  ),
                })
              }
            />
            <span className="font-mono text-zinc-400">)</span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...group,
                  groups: groups.filter(
                    (_, groupIndex) => groupIndex !== index,
                  ),
                })
              }
              className="px-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Remove condition group"
            >
              ×
            </button>
          </span>
        </span>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange({
            ...group,
            atoms: [...group.atoms, defaultAtom(availableConditions)],
          })
        }
        className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        + condition
      </button>

      {depth === 0 && (
        <button
          type="button"
          onClick={() =>
            onChange({
              ...group,
              groups: [
                ...groups,
                {
                  operator: oppositeOperator(group.operator),
                  atoms: [
                    defaultAtom(availableConditions),
                    defaultAtom(availableConditions),
                  ],
                },
              ],
            })
          }
          className="rounded border border-dashed border-zinc-300 px-1.5 py-0.5 text-xs text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-800 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200"
          title="Add a parenthesised group with its own connector"
        >
          + {oppositeOperator(group.operator) === "||" ? "OR" : "AND"} group
        </button>
      )}
    </span>
  );
}

function ConditionEditor({ condition, availableConditions, onSwitchToRaw, onConditionChange }: ConditionEditorProps) {
  if (condition.mode === "guided") {
    const guided: ConditionGuided = condition;
    return (
      <>
        <GuidedConditionGroup
          group={guided.group}
          availableConditions={availableConditions}
          onChange={(group) =>
            onConditionChange({ mode: "guided", group })
          }
        />
        <button
          type="button"
          onClick={onSwitchToRaw}
          className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          title="Switch to raw expression mode"
        >
          Expression
        </button>
      </>
    );
  }

  // Raw mode
  const raw = condition;
  return (
    <>
      <ConditionExpressionInput
        value={raw.expr}
        placeholder="condition expression"
        suggestions={availableConditions}
        onChange={(expr) => onConditionChange({ mode: "raw", expr })}
      />
      <button
        type="button"
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
  /** Id of the rule firing on the current tick — highlighted live during a run. */
  activeRuleId?: string | null;
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

/** Keep insertion semantics explicit: authored arrays are executable flow order. */
export function appendRuleToFlow(
  rules: VisualRule[],
  rule: VisualRule,
): VisualRule[] {
  return [...rules, rule];
}

export function RuleBuilder({ rules, folders, states, functions, availableBricks, availableConditions, onChange, onFoldersChange, activeRuleId }: Props) {
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
    // Functional updater so rapid double-clicks each append to the latest list.
    // The array is the flowchart, so a new branch starts after existing work.
    onChange((prev) => {
      return appendRuleToFlow(
        prev,
        makeDefaultRule(states, functions, prev.length),
      );
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

  const updateCondition = (index: number, cond: VisualCondition) =>
    update(index, { condition: cond });

  const switchToRaw = (rule: VisualRule, index: number) => {
    if (rule.condition.mode === "guided") {
      updateCondition(index, {
        mode: "raw",
        expr: compileCondition(rule.condition),
      });
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
        <p>A rule has two parts:</p>
        <p className="my-1.5 font-mono text-zinc-700 dark:text-zinc-300">
          WHEN &lt;something is true&gt; → DO &lt;this action&gt;
        </p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>
            <strong className="font-semibold text-zinc-700 dark:text-zinc-300">WHEN</strong>{" "}is
            a question about what is happening right now. For example: &quot;Is it
            raining?&quot; or &quot;Is there a wall ahead?&quot;
          </li>
          <li>
            <strong className="font-semibold text-zinc-700 dark:text-zinc-300">DO</strong>{" "}is
            what happens when the answer is yes.
          </li>
        </ul>
        <ul className="mt-1.5 ml-4 list-disc space-y-0.5">
          <li>The simulation runs one step at a time.</li>
          <li>
            On each step, the rules are checked from <strong>top to bottom</strong>.
          </li>
          <li>
            The <strong>first</strong> rule that is true wins. The rules below it are
            skipped for that step.
          </li>
          <li>To change which rule wins, move it up or down the list.</li>
          <li>If no rule is true, nothing happens on that step.</li>
          <li>
            Some actions have more than one step, like &quot;turn right, then
            move&quot;. You build these in the Functions tab.
          </li>
          <li>
            Once a multi-step action starts, it finishes all its steps before the rules
            are checked again. It only stops early if the next step is not safe.
          </li>
        </ul>

        <details className="mt-2">
          <summary className="cursor-pointer select-none font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200">
            See an example
          </summary>
          <div className="mt-2 rounded border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-200">
              Two rules for deciding about an umbrella:
            </p>
            <pre className="overflow-x-auto rounded bg-zinc-50 p-2 font-mono text-[11px] leading-relaxed text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
{`1  WHEN isRaining  → take an umbrella
2  WHEN always     → leave the umbrella at home`}
            </pre>
            <ul className="ml-4 mt-2 list-disc space-y-0.5">
              <li>
                It is raining. Rule 1 is true, so you <strong>take an umbrella</strong>.
                Rule 2 is skipped.
              </li>
              <li>
                It is sunny. Rule 1 is false, so rule 2 is checked next. Rule 2 is always
                true, so you <strong>leave the umbrella at home</strong>.
              </li>
              <li>
                Order matters. If rule 2 were on top, it would be true every day, and you
                would never take an umbrella.
              </li>
            </ul>
          </div>
        </details>
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
          No rules yet. Nothing will happen until you add at least one rule.
        </div>
      )}

      {ordered.map((rule, index) => {
        const folder = rule.folderId ? folders.find((item) => item.id === rule.folderId) : undefined;
        // Keep the global `ordered` list intact. A collapsed folder only hides
        // its cards; it never filters, renumbers, or otherwise changes rules.
        if (folder?.collapsed) return null;

        // The rule firing on the current tick glows softly during a run.
        const isActive = !!activeRuleId && rule.id === activeRuleId;

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
          className={[
            "flex flex-col gap-3 rounded-lg border p-3 transition-colors",
            isActive
              ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300/70 dark:border-amber-400/60 dark:bg-amber-400/10 dark:ring-amber-400/30"
              : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
          ].join(" ")}
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
