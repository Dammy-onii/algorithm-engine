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

/**
 * Which bundler Sandpack uses for a template. The "vanilla" template's own bundler ships an
 * old Babel that rejects modern syntax (`??`, `?.`, `??=`, class fields, `1_000`) in both
 * the preview and the tests, and it can't be fixed with a .babelrc. The Create React App
 * bundler handles plain JavaScript projects too (including a root index.html), so vanilla
 * projects run on it. The files the candidate sees are unchanged.
 */
export function sandpackSetupFor(template: "react" | "vanilla") {
  return template === "vanilla" ? { environment: "create-react-app" as const } : undefined;
}

export function getRuntime(id: string): RuntimeAdapter | undefined {
  return RUNTIMES.find((runtime) => runtime.id === id);
}
