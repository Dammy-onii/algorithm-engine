"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  BOOLEAN_FLAGS,
  FLAG_LABELS,
  NUMERIC_FLAGS,
} from "./conditionFlags";
import { allDomainFlagSpecs } from "@/lib/engine/worlds/registry";

export interface ConditionFlagGroup {
  label: string;
  flags: string[];
}

const GENERAL_FLAGS = new Set<string>(["always", "never", "tick"]);
const NAVIGATION_FLAGS = new Set<string>([
  ...BOOLEAN_FLAGS.filter((flag) => !GENERAL_FLAGS.has(flag)),
  ...NUMERIC_FLAGS.filter((flag) => !GENERAL_FLAGS.has(flag)),
]);
const DOMAIN_FLAG_IDS = new Set(allDomainFlagSpecs().map((flag) => flag.id));

/** Stable, small groups for the rule-condition picker. */
export function groupConditionFlags(flags: string[]): ConditionFlagGroup[] {
  const unique = [...new Set(flags)];
  const groups: ConditionFlagGroup[] = [
    { label: "General", flags: [] },
    { label: "Navigation and progress", flags: [] },
    { label: "This world’s facts", flags: [] },
    { label: "Your reusable conditions", flags: [] },
  ];

  for (const flag of unique) {
    if (GENERAL_FLAGS.has(flag)) groups[0].flags.push(flag);
    else if (NAVIGATION_FLAGS.has(flag)) groups[1].flags.push(flag);
    else if (DOMAIN_FLAG_IDS.has(flag)) groups[2].flags.push(flag);
    else groups[3].flags.push(flag);
  }

  return groups.filter((group) => group.flags.length > 0);
}

interface Props {
  value: string;
  flags: string[];
  onSelect: (flag: string) => void;
}

interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
}

export interface ConditionPickerPosition {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
  placement: "above" | "below";
}

/**
 * Keep the menu inside the viewport and prefer the side with more usable
 * space. Exported so positioning remains regression-testable without a DOM.
 */
export function conditionPickerPosition(
  trigger: RectLike,
  viewportWidth: number,
  viewportHeight: number,
): ConditionPickerPosition {
  const edge = 8;
  const gap = 4;
  const usableWidth = Math.max(0, viewportWidth - edge * 2);
  const width = Math.min(320, usableWidth);
  const left = Math.min(
    Math.max(edge, trigger.left),
    Math.max(edge, viewportWidth - width - edge),
  );
  const below = Math.max(0, viewportHeight - trigger.bottom - gap - edge);
  const above = Math.max(0, trigger.top - gap - edge);
  const placement = below >= 240 || below >= above ? "below" : "above";
  const available = placement === "below" ? below : above;

  return {
    left,
    width,
    maxHeight: Math.min(360, available),
    placement,
    ...(placement === "below"
      ? { top: trigger.bottom + gap }
      : { bottom: viewportHeight - trigger.top + gap }),
  };
}

/**
 * Searchable custom picker rendered through a body portal. It overlays the
 * workspace instead of extending a rule card or forcing the browser/page
 * scrollbar to make room for its options.
 */
export function ConditionFlagPicker({ value, flags, onSelect }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<ConditionPickerPosition | null>(null);
  const normalized = query.trim().toLocaleLowerCase();
  const groups = useMemo(() => {
    const available = flags.includes(value) ? flags : [value, ...flags];
    return groupConditionFlags(
      available.filter((flag) => {
        if (!normalized) return true;
        return `${flag} ${FLAG_LABELS[flag] ?? ""}`
          .toLocaleLowerCase()
          .includes(normalized);
      }),
    );
  }, [flags, normalized, value]);
  const resultCount = groups.reduce(
    (total, group) => total + group.flags.length,
    0,
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setPosition(
      conditionPickerPosition(
        trigger.getBoundingClientRect(),
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    searchRef.current?.focus();

    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popupRef.current?.contains(target)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const choose = (flag: string) => {
    onSelect(flag);
    setQuery("");
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!open) updatePosition();
          setOpen((current) => !current);
        }}
        className="flex min-w-36 items-center justify-between gap-2 rounded px-1.5 py-0.5 font-medium text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-700"
      >
        <span className="truncate">{FLAG_LABELS[value] ?? value}</span>
        <span
          className={[
            "text-[10px] text-zinc-400 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          ⌄
        </span>
      </button>

      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            role="listbox"
            aria-label="Available conditions"
            className="fixed z-[100] flex overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
            style={{
              left: position.left,
              top: position.top,
              bottom: position.bottom,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
          >
            <div className="flex min-h-0 w-full flex-col">
              <div className="shrink-0 border-b border-zinc-100 p-2 dark:border-zinc-800">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search conditions…"
                  aria-label="Search available conditions"
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
                {groups.map((group) => (
                  <section key={group.label} className="mb-2 last:mb-0">
                    <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                      {group.label}
                    </p>
                    {group.flags.map((flag) => (
                      <button
                        key={flag}
                        type="button"
                        role="option"
                        aria-selected={flag === value}
                        onClick={() => choose(flag)}
                        className={[
                          "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-xs",
                          flag === value
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                        ].join(" ")}
                      >
                        <span className="truncate">{FLAG_LABELS[flag] ?? flag}</span>
                        <code className="shrink-0 text-[9px] opacity-60">{flag}</code>
                      </button>
                    ))}
                  </section>
                ))}
                {resultCount === 0 && (
                  <p className="px-3 py-5 text-center text-xs text-zinc-400">
                    No condition matches “{query}”.
                  </p>
                )}
              </div>

              <p className="shrink-0 border-t border-zinc-100 px-3 py-2 text-[9px] text-zinc-400 dark:border-zinc-800">
                {resultCount} result{resultCount === 1 ? "" : "s"} · type to narrow
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
