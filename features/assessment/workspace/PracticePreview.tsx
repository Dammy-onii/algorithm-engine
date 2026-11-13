"use client";

import { useEffect, useState } from "react";
import { SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";

import { getRuntime, sandpackProviderSetup } from "@/lib/assessment/runtime/registry";
import type { CodeProblem } from "@/lib/assessment/problems";
import type { FileMap } from "@/lib/assessment/types";
import { loadPracticeFiles, parseSaved, practiceStorageKey } from "./practiceStorage";

/**
 * Full-window preview of a practice problem, showing the work saved in this browser.
 *
 * It follows edits made in the workspace tab: the workspace writes the project to
 * localStorage every couple of seconds, and the `storage` event fires here (in the other
 * tab) whenever that value changes. The preview is then restarted with the new files.
 * (Sandpack's updateFile does not reach a preview-only provider: its client never reports
 * "done", so live updates are silently skipped. Remounting is reliable and takes ~1s.)
 */
export function PracticePreview({ problem }: { problem: CodeProblem }) {
  const runtime = getRuntime(problem.runtimeId)!;
  const [project, setProject] = useState<{ files: FileMap; version: number } | null>(null);

  useEffect(() => {
    // localStorage is browser-only, so saved work is read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProject({ files: loadPracticeFiles(problem.id, runtime.entryFile) ?? problem.files, version: 0 });
    const onStorage = (event: StorageEvent) => {
      if (event.key !== practiceStorageKey(problem.id)) return;
      // No saved value means the learner pressed Reset: show the starting code.
      const files = parseSaved(event.newValue, runtime.entryFile) ?? problem.files;
      setProject((prev) => ({ files, version: (prev?.version ?? 0) + 1 }));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [problem, runtime.entryFile]);

  if (!project) return null;

  return (
    <div className="h-screen bg-white" style={{ ["--sp-layout-height" as string]: "100vh" }}>
      {/* The loading overlay is hidden: under React Strict Mode (dev) Sandpack registers this
          preview twice and its overlay waits on the stale client, so it never clears and the
          tab looks blank even though the app has rendered underneath. The iframe shows the
          app as soon as it is ready, so the overlay isn't needed here. */}
      <style>{`.sp-wrapper, .sp-preview-container, .sp-preview-iframe { height: 100vh; background: #fff; } .sp-loading { display: none !important; }`}</style>
      <SandpackProvider key={project.version} {...sandpackProviderSetup(runtime)} files={project.files} options={{ initMode: "immediate" }}>
        <SandpackPreview style={{ height: "100vh" }} showNavigator={false} showOpenInCodeSandbox={false} />
      </SandpackProvider>
    </div>
  );
}
