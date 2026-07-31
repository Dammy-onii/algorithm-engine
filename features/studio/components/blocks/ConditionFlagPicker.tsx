"use client";

import { useMemo, useRef, useState } from "react";

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

/**
 * Searchable custom picker used instead of an unbounded native select. The
 * result panel stays below the rule input and never grows beyond one viewport
 * section.
 */
export function ConditionFlagPicker({ value, flags, onSelect }: Props) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
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

  const choose = (flag: string) => {
    onSelect(flag);
    setQuery("");
    detailsRef.current?.removeAttribute("open");
  };

  return (
    <details
      ref={detailsRef}
      className="group/flag relative min-w-36"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          event.currentTarget.removeAttribute("open");
          setQuery("");
        }
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded px-1.5 py-0.5 font-medium text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-700">
        <span className="truncate">{FLAG_LABELS[value] ?? value}</span>
        <span className="text-[10px] text-zinc-400 transition-transform group-open/flag:rotate-180">
          ⌄
        </span>
      </summary>

      <div className="absolute left-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                detailsRef.current?.removeAttribute("open");
                setQuery("");
              }
            }}
            placeholder="Search conditions…"
            aria-label="Search available conditions"
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </div>

        <div className="max-h-56 overflow-y-auto overscroll-contain p-1.5">
          {groups.map((group) => (
            <section key={group.label} className="mb-2 last:mb-0">
              <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                {group.label}
              </p>
              {group.flags.map((flag) => (
                <button
                  key={flag}
                  type="button"
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

        <p className="border-t border-zinc-100 px-3 py-2 text-[9px] text-zinc-400 dark:border-zinc-800">
          {resultCount} result{resultCount === 1 ? "" : "s"} · type to narrow
        </p>
      </div>
    </details>
  );
}
