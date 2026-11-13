import { SANDBOX_TEMPLATES } from "@codesandbox/sandpack-react";

import type { FileMap } from "@/lib/assessment/types";

type SandpackFiles = Record<string, string | { code: string }>;

/**
 * The project as the author defined it, minus template boilerplate Sandpack adds
 * (index.js, styles.css, package.json, …) that the learner never touched.
 */
export function collectProjectFiles(
  sandpackFiles: SandpackFiles,
  initialKeys: string[],
  /** null for a standalone project: every file is the author's, nothing is dropped. */
  template: "react" | "vanilla" | null,
): FileMap {
  const known = new Set(initialKeys);
  const defaults = (template ? SANDBOX_TEMPLATES[template].files : {}) as SandpackFiles;
  const out: FileMap = {};
  for (const [path, file] of Object.entries(sandpackFiles)) {
    const code = typeof file === "string" ? file : file.code;
    const def = defaults[path];
    const defaultCode = typeof def === "string" ? def : def?.code;
    if (!known.has(path) && defaultCode !== undefined && defaultCode === code) continue;
    out[path] = code;
  }
  return out;
}
