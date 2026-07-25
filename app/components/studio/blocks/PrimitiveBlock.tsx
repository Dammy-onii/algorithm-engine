"use client";

/**
 * PrimitiveBlock — visual representation of an engine-owned primitive action.
 *
 * These are the "machine code" tiles the user can drag into function sequences
 * or select from the brick palette. They render as filled dark chips to signal
 * that they are engine-owned and cannot be modified (vs. outlined user bricks).
 */

const PRIMITIVE_META: Record<string, { label: string; icon: string; shortKey: string }> = {
  moveForward: { label: "Move Forward", icon: "▲", shortKey: "F" },
  turnLeft:    { label: "Turn Left",    icon: "↺", shortKey: "L" },
  turnRight:   { label: "Turn Right",   icon: "↻", shortKey: "R" },
  wait:        { label: "Wait",         icon: "■", shortKey: "W" },
  pickUp:      { label: "Pick Up",      icon: "□", shortKey: "P" },
  deliver:     { label: "Deliver",      icon: "●", shortKey: "D" },
  charge:      { label: "Charge",       icon: "⚡", shortKey: "C" },
};

/**
 * Sequences store *brick ids* (`step`), while the palette renders *action types*
 * (`moveForward`). Map brick ids onto their primitive so a step in a sequence
 * renders as a real block instead of an unknown placeholder.
 */
const BRICK_ALIAS: Record<string, string> = {
  step: "moveForward",
  "pivot-left": "turnLeft",
  "pivot-right": "turnRight",
  hold: "wait",
  "pick-up": "pickUp",
  deliver: "deliver",
  charge: "charge",
};

/** Resolve a token (action type or brick id) to primitive metadata, or null if
 *  it is a user-composed function (which has no primitive glyph). */
function resolveMeta(token: string) {
  if (PRIMITIVE_META[token]) return PRIMITIVE_META[token];
  const aliased = BRICK_ALIAS[token];
  return aliased ? PRIMITIVE_META[aliased] : null;
}

interface Props {
  actionType: string;
  /** If true, renders as a compact badge (e.g. inside a function sequence). */
  compact?: boolean;
  /** If true, shows a drag handle (used in the function composer). */
  draggable?: boolean;
  onClick?: () => void;
}

export function PrimitiveBlock({ actionType, compact = false, draggable = false, onClick }: Props) {
  const meta = resolveMeta(actionType);

  // Not a primitive → a user-composed function used as a step. Render it as a
  // named, outlined chip rather than an unknown placeholder.
  if (!meta) {
    if (compact) {
      return (
        <span
          title={`Your function: ${actionType}`}
          className="inline-flex items-center rounded border border-zinc-400 px-1.5 py-0.5 font-mono text-xs font-semibold text-zinc-700 dark:border-zinc-500 dark:text-zinc-300"
        >
          {actionType}
        </span>
      );
    }
    return (
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
        className={[
          "flex select-none items-center gap-2 rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm font-medium text-zinc-700",
          "dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-300",
          onClick ? "cursor-pointer transition-all hover:bg-zinc-50 active:scale-95" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="font-mono">{actionType}</span>
      </div>
    );
  }

  if (compact) {
    return (
      <span
        title={meta.label}
        className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs font-semibold text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900"
      >
        {meta.icon} {meta.shortKey}
      </span>
    );
  }

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={draggable}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={[
        "flex select-none items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-white",
        "dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900",
        onClick ? "cursor-pointer transition-all hover:bg-zinc-700 active:scale-95 dark:hover:bg-zinc-300" : "",
        draggable ? "cursor-grab active:cursor-grabbing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-base leading-none">{meta.icon}</span>
      <span>{meta.label}</span>
      <span className="ml-auto font-mono text-xs text-zinc-400 dark:text-zinc-500">{meta.shortKey}</span>
    </div>
  );
}
