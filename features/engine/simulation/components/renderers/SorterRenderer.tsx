"use client";

/**
 * Sorting desk view.
 *
 * A conveyor of waiting items feeds one decision point; each decision drops the
 * item into one of two bins. Sorted items keep their place in the bin and are
 * marked right or wrong, so a mis-sorted item is visible the moment it lands —
 * the learner can see exactly which case their rules got wrong.
 */

import { World } from "@/lib/engine/world/world";
import {
  sorterMistakes,
  sorterRuntime,
  type SortedItem,
  type SorterBinId,
  type SorterItem,
} from "@/lib/engine/worlds/sorter";

const VISIBLE_UPCOMING = 20;

/** Stable small tilt/offset per card so the waiting pile looks scattered, not lined up. */
function scatter(id: string): { rotate: number; x: number; y: number } {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  // Final avalanche so neighbouring ids ("n2", "n3") land far apart.
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  hash = (hash ^ (hash >>> 16)) >>> 0;
  return {
    rotate: (hash % 25) - 12,
    x: ((hash >>> 8) % 9) - 4,
    y: ((hash >>> 16) % 9) - 4,
  };
}

export function SorterRenderer({ world }: { world: World; animationRate?: number }) {
  const runtime = sorterRuntime(world);
  if (!runtime) return null;

  const [current, ...upcoming] = runtime.queue;
  const hidden = Math.max(0, upcoming.length - VISIBLE_UPCOMING);
  const mistakes = sorterMistakes(runtime);
  const binLabel = (bin: SorterBinId) =>
    bin === "A" ? runtime.binA.label : runtime.binB.label;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Sorting point
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-20 min-w-24 shrink-0 items-center justify-center rounded-lg border-2 border-zinc-900 bg-white px-3 dark:border-zinc-100 dark:bg-zinc-950">
            {current ? (
              <ItemFace item={current} large />
            ) : (
              <span className="text-xs text-zinc-400">Empty</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-1">
            {upcoming.slice(0, VISIBLE_UPCOMING).map((item) => {
              const { rotate, x, y } = scatter(item.id);
              return (
                <span
                  key={item.id}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  style={{ transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)` }}
                >
                  <ItemFace item={item} />
                </span>
              );
            })}
            {hidden > 0 && (
              <span className="text-xs text-zinc-500">+{hidden} more</span>
            )}
            {upcoming.length === 0 && current && (
              <span className="text-xs text-zinc-500">Last item</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["A", "B"] as const).map((bin) => (
          <Bin
            key={bin}
            label={binLabel(bin)}
            items={runtime.sorted.filter((item) => item.bin === bin)}
            otherLabel={binLabel(bin === "A" ? "B" : "A")}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
        <span>
          Sorted{" "}
          <span className="font-mono text-zinc-700 dark:text-zinc-200">
            {runtime.sorted.length}/{runtime.totalItems}
          </span>
        </span>
        <span>
          Mistakes{" "}
          <span
            className={`font-mono ${mistakes > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-200"}`}
          >
            {mistakes}
          </span>
        </span>
      </div>
    </div>
  );
}

function ItemFace({ item, large = false }: { item: SorterItem; large?: boolean }) {
  const numeric = typeof item.number === "number";
  return (
    <span className="flex flex-col items-center gap-0.5 text-center">
      <span
        className={[
          "font-semibold text-zinc-900 dark:text-zinc-100",
          numeric ? "font-mono" : "",
          large ? (numeric ? "text-3xl" : "text-sm") : "text-xs",
        ].join(" ")}
      >
        {item.label}
      </span>
      {item.fragile && (
        <span className="rounded-sm bg-amber-100 px-1 text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
          Fragile
        </span>
      )}
    </span>
  );
}

function Bin({
  label,
  items,
  otherLabel,
}: {
  label: string;
  items: SortedItem[];
  otherLabel: string;
}) {
  return (
    <div className="flex min-h-32 flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-baseline justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
        <span className="font-mono text-xs text-zinc-500">{items.length}</span>
      </div>
      <div className="flex flex-wrap content-start gap-1.5 p-2">
        {items.map((item) => {
          const right = item.bin === item.correctBin;
          return (
            <span
              key={item.id}
              title={right ? "Correct" : `Wrong bin — belongs in ${otherLabel}`}
              className={[
                "flex items-center gap-1 rounded-md border px-2 py-1",
                right
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                  : "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40",
              ].join(" ")}
            >
              <ItemFace item={item} />
              <span
                aria-label={right ? "correct" : "wrong bin"}
                className={`text-xs font-bold ${right ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {right ? "✓" : "✗"}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
