"use client";

import { useMemo, useState } from "react";

import { filesAtSnapshot, lineDiff } from "@/lib/assessment/files";
import type { Snapshot } from "@/lib/assessment/types";
import { formatDuration } from "./format";

const REASON_LABEL: Record<Snapshot["reason"], string> = {
  start: "Started", autosave: "Edited", run: "Ran tests", submit: "Submitted",
};

/** Scrub through a candidate's session: pick a moment and see what changed and the code at that point. */
export function SubmissionReplay({ snapshots }: { snapshots: Snapshot[] }) {
  const [index, setIndex] = useState(snapshots.length - 1);
  const [compare, setCompare] = useState<"previous" | "start">("previous");
  const [picked, setPicked] = useState<string | null>(null);

  const now = useMemo(() => filesAtSnapshot(snapshots, index), [snapshots, index]);
  const before = useMemo(
    () => (compare === "start" ? filesAtSnapshot(snapshots, 0) : filesAtSnapshot(snapshots, index - 1)),
    [snapshots, index, compare],
  );
  const changed = useMemo(
    () => Object.keys({ ...now, ...before }).filter((p) => now[p] !== before[p]).sort(),
    [now, before],
  );
  const allPaths = Object.keys(now).sort();
  const file = picked && (picked in now || picked in before) ? picked : (changed[0] ?? allPaths[0] ?? null);
  const diff = file ? lineDiff(before[file] ?? "", now[file] ?? "") : [];
  const snap = snapshots[index];

  return (
    <section aria-label="Session replay" className="rounded-lg border border-zinc-300 dark:border-zinc-700">
      <div className="border-b border-zinc-300 p-4 dark:border-zinc-700">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold">
            Step {index + 1} of {snapshots.length}: {REASON_LABEL[snap.reason]} at {formatDuration(snap.at)}
          </span>
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            Compare with
            <select value={compare} onChange={(e) => setCompare(e.target.value as "previous" | "start")} className="rounded border border-zinc-300 bg-white px-1 py-0.5 dark:border-zinc-700 dark:bg-zinc-900">
              <option value="previous">previous step</option>
              <option value="start">starting code</option>
            </select>
          </label>
        </div>
        <input type="range" min={0} max={snapshots.length - 1} value={index} onChange={(e) => setIndex(Number(e.target.value))} aria-label="Replay position" className="mt-3 w-full" />
        <div className="relative mt-1 h-3" aria-hidden>
          {snapshots.map((s, i) => s.reason === "run" || s.reason === "submit" ? (
            <span key={i} className={`absolute top-0 h-3 w-0.5 ${s.reason === "run" ? "bg-green-500" : "bg-zinc-900 dark:bg-zinc-100"}`} style={{ left: `${snapshots.length === 1 ? 0 : (i / (snapshots.length - 1)) * 100}%` }} />
          ) : null)}
        </div>
        <p className="text-[11px] text-zinc-500">Green marks are test runs.</p>
      </div>
      <div className="grid min-h-[320px] grid-cols-[220px_1fr]">
        <ul className="overflow-y-auto border-r border-zinc-300 py-1 text-xs font-mono dark:border-zinc-700">
          {allPaths.map((path) => (
            <li key={path}>
              <button type="button" onClick={() => setPicked(path)} className={`flex w-full items-center justify-between gap-2 px-3 py-1 text-left ${path === file ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}>
                <span className="truncate">{path}</span>
                {changed.includes(path) && <span className="text-amber-600" title="Changed in this comparison">●</span>}
              </button>
            </li>
          ))}
        </ul>
        <pre className="overflow-auto p-3 text-[12.5px] leading-relaxed" aria-label={file ? `Diff for ${file}` : "No file"}>
          {file === null ? "No files." : diff.map((line, i) => (
            <div key={i} className={line.type === "add" ? "bg-green-100 text-green-900 dark:bg-green-950/50 dark:text-green-200" : line.type === "del" ? "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200" : ""}>
              <span className="select-none pr-2 text-zinc-400">{line.type === "add" ? "+" : line.type === "del" ? "−" : " "}</span>{line.text || " "}
            </div>
          ))}
        </pre>
      </div>
    </section>
  );
}
