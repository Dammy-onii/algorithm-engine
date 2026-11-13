"use client";

import { useRef, useState } from "react";

import { normalizePath, readFolderUpload, type UploadResult } from "@/lib/assessment/files";
import type { FileMap } from "@/lib/assessment/types";

interface Props {
  files: FileMap;
  onChange: (files: FileMap) => void;
  /** Called after a folder upload so the author sees what was skipped. */
  onUploaded?: (result: UploadResult) => void;
  /** When provided, each file gets a button to move it elsewhere (e.g. into hidden tests). */
  moveLabel?: string;
  onMove?: (path: string) => void;
  isTestFile?: (path: string) => boolean;
  emptyHint: string;
}

const field =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

/** A small file tree + text editor used to author the starter project and the hidden tests. */
export function FileEditor({ files, onChange, onUploaded, moveLabel, onMove, isTestFile, emptyHint }: Props) {
  const paths = Object.keys(files).sort();
  const [selected, setSelected] = useState<string | null>(null);
  const [newPath, setNewPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const current = selected && selected in files ? selected : (paths[0] ?? null);

  function addFile() {
    try {
      const path = normalizePath(newPath);
      if (path in files) throw new Error("That file already exists.");
      onChange({ ...files, [path]: "" });
      setSelected(path);
      setNewPath("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid path.");
    }
  }

  function remove(path: string) {
    const next = { ...files };
    delete next[path];
    onChange(next);
  }

  async function upload(list: FileList | null) {
    if (!list || list.length === 0) return;
    const entries = Array.from(list).map((file) => ({
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      size: file.size,
      read: () => file.text(),
    }));
    const result = await readFolderUpload(entries);
    onChange({ ...files, ...result.files });
    onUploaded?.(result);
    if (folderInput.current) folderInput.current.value = "";
  }

  return (
    <div className="grid min-h-[420px] grid-cols-[240px_1fr] overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
      <div className="flex flex-col border-r border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="flex-1 overflow-y-auto py-1">
          {paths.length === 0 && <p className="p-3 text-xs text-zinc-500">{emptyHint}</p>}
          {paths.map((path) => (
            <div
              key={path}
              className={`group flex items-center justify-between gap-1 px-2 py-1 text-xs font-mono ${
                path === current ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setSelected(path)} title={path}>
                {path}
                {isTestFile?.(path) && <span className="ml-1 rounded bg-green-100 px-1 text-[10px] text-green-700 dark:bg-green-950 dark:text-green-300">test</span>}
              </button>
              {onMove && moveLabel && (
                <button type="button" title={moveLabel} onClick={() => onMove(path)} className="hidden text-[10px] text-zinc-500 hover:text-zinc-900 group-hover:block dark:hover:text-zinc-100">
                  {moveLabel}
                </button>
              )}
              <button type="button" aria-label={`Delete ${path}`} onClick={() => remove(path)} className="hidden text-zinc-400 hover:text-rose-600 group-hover:block">
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-zinc-300 p-2 dark:border-zinc-700">
          <div className="flex gap-1">
            <input
              className={`${field} min-w-0 flex-1 font-mono text-xs`}
              placeholder="src/utils/new.js"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFile()}
              aria-label="New file path"
            />
            <button type="button" onClick={addFile} className="rounded-md bg-zinc-900 px-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              Add
            </button>
          </div>
          <input
            ref={folderInput}
            type="file"
            className="hidden"
            // webkitdirectory is non-standard but supported by all major browsers.
            {...({ webkitdirectory: "", directory: "", multiple: true } as Record<string, unknown>)}
            onChange={(e) => void upload(e.target.files)}
          />
          <button type="button" onClick={() => folderInput.current?.click()} className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
            Upload a folder…
          </button>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
      </div>
      <div className="flex flex-col">
        {current ? (
          <>
            <div className="border-b border-zinc-300 px-3 py-1.5 font-mono text-xs text-zinc-500 dark:border-zinc-700">{current}</div>
            <textarea
              aria-label={`Contents of ${current}`}
              spellCheck={false}
              value={files[current]}
              onChange={(e) => onChange({ ...files, [current]: e.target.value })}
              className="min-h-[380px] flex-1 resize-none bg-white p-3 font-mono text-[13px] leading-relaxed outline-none dark:bg-zinc-900"
            />
          </>
        ) : (
          <p className="p-6 text-sm text-zinc-500">{emptyHint}</p>
        )}
      </div>
    </div>
  );
}
