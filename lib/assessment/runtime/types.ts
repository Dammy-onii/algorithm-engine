import type { FileMap } from "../types";

/**
 * A runtime adapter tells CTRL how to author, run and test one kind of project.
 * Adding a framework or language means registering a new adapter; the editor,
 * snapshots, storage and dashboard do not change. See docs/CODEBASE_ASSESSMENT_RUNTIMES.md.
 */
export interface RuntimeAdapter {
  id: string;
  label: string;
  description: string;
  /** How the candidate workspace executes this project. */
  engine: "sandpack";
  /** Sandpack template used for the engine above ("react", "vanilla", …). */
  template: "react" | "vanilla";
  /** Files that count as visible tests (shown to the candidate, runnable in the browser). */
  isTestFile: (path: string) => boolean;
  /** Entry file shown first in the editor. */
  entryFile: string;
  /** A small example project, offered as a starting point when authoring. */
  exampleProject: () => { files: FileMap; hiddenTests: FileMap; scenario: string };
  /**
   * Set when the project's own files are the whole project, laid out like a standard
   * app (for React: public/, src/, package.json). Sandpack's template files are then not
   * added, and `entry` is the file the bundler starts from. Dependencies come from the
   * project's package.json.
   */
  standalone?: { entry: string };
}
