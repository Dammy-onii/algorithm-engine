import type { RuntimeAdapter } from "./types";
import { reactExample, vanillaExample } from "./examples";

const isJsTest = (path: string) => /\.(test|spec)\.[jt]sx?$/.test(path);

export const RUNTIMES: readonly RuntimeAdapter[] = [
  {
    id: "react-js",
    label: "React (JavaScript)",
    description: "React 18 with a live preview and in-browser Jest tests.",
    engine: "sandpack",
    template: "react",
    isTestFile: isJsTest,
    entryFile: "/App.js",
    exampleProject: reactExample,
  },
  {
    id: "vanilla-js",
    label: "JavaScript (no framework)",
    description: "Plain JavaScript and HTML with a live preview and in-browser Jest tests.",
    engine: "sandpack",
    template: "vanilla",
    isTestFile: isJsTest,
    entryFile: "/index.js",
    exampleProject: vanillaExample,
  },
];

export const DEFAULT_RUNTIME_ID = "react-js";

export function getRuntime(id: string): RuntimeAdapter | undefined {
  return RUNTIMES.find((runtime) => runtime.id === id);
}
