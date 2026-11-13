"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";

import { boilerplateTemplate, getRuntime } from "@/lib/assessment/runtime/registry";
import type { RuntimeAdapter } from "@/lib/assessment/runtime/types";
import type { CodeProblem } from "@/lib/assessment/problems";
import { collectProjectFiles } from "./collect";
import { loadPracticeFiles as loadSaved, practiceStorageKey as storageKey } from "./practiceStorage";
import { WorkspaceShell } from "./WorkspaceShell";

const LEVEL_STYLE: Record<CodeProblem["level"], string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-rose-100 text-rose-800",
};

/**
 * Lives inside the Sandpack context. Restores saved work once after mount (through
 * Sandpack's file API, so the workspace itself renders immediately with the starter code),
 * saves changes back to this browser as the learner types, and exposes a reset.
 */
function LocalProgress({ problem, runtime, registerReset }: {
  problem: CodeProblem; runtime: RuntimeAdapter; registerReset: (reset: () => void) => void;
}) {
  const template = boilerplateTemplate(runtime);
  const entryFile = runtime.entryFile;
  const { sandpack, listen } = useSandpack();
  const sp = useRef(sandpack);
  const listenRef = useRef(listen);
  useEffect(() => { sp.current = sandpack; listenRef.current = listen; });
  const initialKeys = useMemo(() => Object.keys(problem.files), [problem.files]);

  // Apply saved work only after the first bundle finishes. Changes made before the bundler
  // is live update the editor but never reach the preview or the test runner.
  useEffect(() => {
    const saved = loadSaved(problem.id, entryFile);
    if (!saved) return;
    let applied = false;
    const apply = () => {
      if (applied) return;
      applied = true;
      const api = sp.current;
      for (const [path, code] of Object.entries(saved)) {
        const current = api.files[path];
        const currentCode = typeof current === "string" ? current : current?.code;
        if (currentCode !== code) api.updateFile(path, code);
      }
      for (const path of initialKeys) if (!(path in saved)) api.deleteFile(path);
    };
    // Wait until every Sandpack frame (the preview and the test runner) has finished its
    // first build. Sandpack only pushes file changes to frames that are done, so applying on
    // the first "done" (often the test runner's) left the preview on the starting code.
    // A fallback applies anyway a few seconds after the first "done".
    let doneCount = 0;
    let fallback = 0;
    const unsubscribe = listenRef.current((message) => {
      if (message.type !== "done") return;
      doneCount += 1;
      if (doneCount === 1) fallback = window.setTimeout(finish, 4000);
      if (doneCount >= Object.keys(sp.current.clients).length) finish();
    });
    function finish() {
      window.clearTimeout(fallback);
      unsubscribe();
      apply();
    }
    return () => {
      window.clearTimeout(fallback);
      unsubscribe();
    };
  }, [problem.id, initialKeys, entryFile]);

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        localStorage.setItem(storageKey(problem.id), JSON.stringify(collectProjectFiles(sp.current.files, initialKeys, template)));
      } catch {
        // Storage full or blocked: practising still works, it just won't be remembered.
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [problem.id, initialKeys, template]);

  useEffect(() => {
    registerReset(() => {
      localStorage.removeItem(storageKey(problem.id));
      sp.current.resetAllFiles();
    });
  }, [registerReset, problem.id]);

  return null;
}

export function CodePracticeWorkspace({ problem }: { problem: CodeProblem }) {
  const runtime = getRuntime(problem.runtimeId)!;
  const resetRef = useRef<(() => void) | null>(null);
  const registerReset = useCallback((fn: () => void) => { resetRef.current = fn; }, []);

  function reset() {
    if (window.confirm("Reset to the starting code? Your changes will be lost.")) resetRef.current?.();
  }

  const header = (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-4 dark:border-zinc-800">
      <Link href="/app" className="font-mono text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Problems</Link>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-zinc-500 sm:block">Saved in this browser</span>
        <button type="button" onClick={reset} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
          Reset
        </button>
      </div>
    </header>
  );

  return (
    <WorkspaceShell
      header={header}
      briefTop={
        <div className="mb-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <h1 className="text-2xl font-semibold tracking-tight">{problem.title}</h1>
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${LEVEL_STYLE[problem.level]}`}>{problem.level}</span>
        </div>
      }
      brief={problem.scenario}
      runtime={runtime}
      files={problem.files}
      activeFile={problem.openFile ?? runtime.entryFile}
      tabs={problem.tabs}
      previewHref={`/app/code/${problem.id}/preview`}
    >
      <LocalProgress problem={problem} runtime={runtime} registerReset={registerReset} />
    </WorkspaceShell>
  );
}
