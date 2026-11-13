"use client";

import { useState, type ReactNode } from "react";
import {
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackPreview,
  SandpackProvider,
  SandpackTests,
  useSandpack,
} from "@codesandbox/sandpack-react";

import type { FileMap } from "@/lib/assessment/types";
import { Brief } from "./Brief";

/** Drag-to-resize for a panel. `invert` grows the panel when dragging up/left. */
function useResize(initial: number, min: number, max: number, axis: "x" | "y", invert = false) {
  const [size, setSize] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const onPointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    const start = axis === "x" ? event.clientX : event.clientY;
    const startSize = size;
    setDragging(true);
    const move = (e: PointerEvent) => {
      const delta = (axis === "x" ? e.clientX : e.clientY) - start;
      setSize(Math.min(max, Math.max(min, startSize + (invert ? -delta : delta))));
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return { size, dragging, onPointerDown };
}

function StatusBar() {
  const { sandpack } = useSandpack();
  return (
    <div data-sandpack-status={sandpack.status} data-sandpack-error={sandpack.error?.message ?? ""} className="flex h-6 shrink-0 items-center justify-between bg-blue-700 px-3 font-mono text-[11px] text-white">
      <span className="truncate">{sandpack.activeFile}</span>
      <span>{sandpack.activeFile.split(".").pop()?.toUpperCase()}</span>
    </div>
  );
}

/*
 * Running tests.
 *
 * Sandpack's own run control is a bare ▶ icon pinned to the *bottom* of the results list, so
 * after the first run it scrolls out of sight, and it is swapped for a spinner while the
 * runner starts. People could not find it and thought tests didn't run. So Sandpack's control
 * is hidden and a labelled "Run tests" button sits in the panel header, always visible, and
 * presses it. We find Sandpack's button through a marker passed as `actionsChildren`, which
 * Sandpack renders immediately before its RunButton (so the RunButton is the marker's
 * `nextElementSibling`). The marker is absent while the runner is starting or running.
 */
const RUN_ANCHOR = "data-ctrl-run-anchor";

function RunTestsButton() {
  const [note, setNote] = useState<string | null>(null);
  const run = () => {
    const sandpackRun = document.querySelector(`[${RUN_ANCHOR}]`)?.nextElementSibling as HTMLElement | null | undefined;
    if (sandpackRun) {
      setNote(null);
      sandpackRun.click();
    } else {
      setNote("Test runner is busy or still starting. Try again in a few seconds.");
      setTimeout(() => setNote(null), 4000);
    }
  };
  return (
    <span className="flex items-center gap-2">
      {note && <span className="text-[11px] normal-case tracking-normal text-amber-300">{note}</span>}
      <button type="button" onClick={run} className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold normal-case tracking-normal text-white hover:bg-blue-500">
        ▶ Run tests
      </button>
    </span>
  );
}

/** Test results. Each completed run fires `ctrl-assessment-run` (used by the recorded flow). */
function TestsPanel() {
  return (
    <div>
      <style>{`.sp-tests :has(> [${RUN_ANCHOR}]) { display: none; }`}</style>
      <p style={{ margin: 0, padding: "6px 12px", fontSize: 12, background: "#1f2430", color: "#aab2c5" }}>
        Tests only run when you press <strong style={{ color: "#fff" }}>▶ Run tests</strong> (next to the Tests heading). Run them again after each change.
      </p>
      <SandpackTests
        verbose
        watchMode={false}
        showWatchButton={false}
        actionsChildren={<span {...{ [RUN_ANCHOR]: "" }} />}
        // Sandpack calls this inside its own state update; defer so listeners' setState happens after it.
        onComplete={() => setTimeout(() => window.dispatchEvent(new CustomEvent("ctrl-assessment-run")), 0)}
      />
    </div>
  );
}

/** "Open in new tab" link plus a copy button, for viewing the preview full size. */
function PreviewLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", new URL(href, window.location.origin).toString());
    }
  };
  return (
    <span className="flex items-center gap-2 text-[11px]">
      <a href={href} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 hover:underline">
        Open in new tab ↗
      </a>
      <button type="button" onClick={copy} className="text-zinc-400 hover:text-white">
        {copied ? "Copied" : "Copy link"}
      </button>
    </span>
  );
}

interface ShellProps {
  header: ReactNode;
  /** Shown above the brief (e.g. the problem title and level). */
  briefTop?: ReactNode;
  /** When set, the preview offers a link to open it full size in another tab. */
  previewHref?: string;
  /** Markdown-subset brief shown in the left panel. */
  brief: string;
  template: "react" | "vanilla";
  files: FileMap;
  activeFile: string;
  /** Rendered inside the Sandpack context (recorders, savers). */
  children?: ReactNode;
}

/**
 * The shared coding workspace: header, a resizable task brief on the left, and a
 * VS Code-style workbench (explorer, tabs, editor, Preview/Tests panel, status bar).
 */
export function WorkspaceShell({ header, briefTop, previewHref, brief, template, files, activeFile, children }: ShellProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const left = useResize(420, 280, 720, "x");
  const bottom = useResize(300, 120, 600, "y", true);
  const dragging = left.dragging || bottom.dragging;
  const visibleFiles = Object.keys(files);

  return (
    <div className={`flex h-screen flex-col bg-white dark:bg-zinc-950 ${dragging ? "select-none" : ""}`}>
      <style>{`
        .sp-wrapper { flex: 1; min-height: 0; display: flex; flex-direction: column; }
        .sp-code-editor, .sp-code-editor .cm-editor { height: 100%; }
        .sp-code-editor .cm-scroller { overflow: auto; }
        .sp-preview-container, .sp-preview-iframe { background: #fff; }
        .ctrl-dragging iframe { pointer-events: none; }
      `}</style>
      {header}
      <div className={`flex min-h-0 flex-1 ${dragging ? "ctrl-dragging" : ""}`}>
        <aside style={{ width: left.size }} className="shrink-0 overflow-y-auto px-5 py-4" aria-label="Task brief">
          {briefTop}
          <Brief source={brief} />
        </aside>
        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={left.onPointerDown}
          className="w-1.5 shrink-0 cursor-col-resize bg-zinc-200 hover:bg-blue-400 dark:bg-zinc-800"
        />
        <div className="flex min-w-0 flex-1 flex-col bg-[#151515]">
          <SandpackProvider
            template={template}
            theme="dark"
            files={files}
            options={{ activeFile: activeFile in files ? activeFile : visibleFiles[0], visibleFiles, recompileMode: "delayed", recompileDelay: 600, initMode: "immediate" }}
          >
            {children}
            <div className="flex min-h-0 flex-1" style={{ ["--sp-layout-height" as string]: "100%" }}>
              <SandpackFileExplorer style={{ width: 210, height: "100%", flexShrink: 0 }} />
              <SandpackCodeEditor style={{ flex: 1, minWidth: 0, height: "100%" }} showTabs showLineNumbers showInlineErrors closableTabs />
            </div>
            <div
              role="separator"
              aria-orientation="horizontal"
              onPointerDown={panelOpen ? bottom.onPointerDown : undefined}
              className={`h-1 shrink-0 bg-zinc-800 ${panelOpen ? "cursor-row-resize hover:bg-blue-500" : ""}`}
            />
            {/* Preview and Tests sit side by side and are always mounted and visible: Sandpack's
                preview and test clients do not finish starting while either one is hidden. */}
            <div className="flex shrink-0 flex-col bg-[#1b1b1b]" style={{ height: panelOpen ? bottom.size : 36 }}>
              <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800 pr-2">
                <div className="flex h-full flex-1">
                  <span className="flex h-full w-1/2 items-center justify-between gap-2 px-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white">Preview</span>
                    {previewHref && <PreviewLink href={previewHref} />}
                  </span>
                  <span className="flex h-full flex-1 items-center justify-between gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white">
                    Tests
                    <RunTestsButton />
                  </span>
                </div>
                <button type="button" onClick={() => setPanelOpen((v) => !v)} aria-label={panelOpen ? "Collapse panel" : "Expand panel"} className="px-2 text-zinc-400 hover:text-white">
                  {panelOpen ? "⌄" : "⌃"}
                </button>
              </div>
              <div className="flex min-h-0 flex-1 overflow-hidden" style={{ ["--sp-layout-height" as string]: "100%" }}>
                <div className="h-full w-1/2 min-w-0 border-r border-zinc-800">
                  <SandpackPreview style={{ height: "100%" }} showNavigator={false} showOpenInCodeSandbox={false} />
                </div>
                <div className="h-full w-1/2 min-w-0 overflow-auto">
                  <TestsPanel />
                </div>
              </div>
            </div>
            <StatusBar />
          </SandpackProvider>
        </div>
      </div>
    </div>
  );
}
