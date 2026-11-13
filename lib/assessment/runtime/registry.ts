import type { RuntimeAdapter } from "./types";
import { reactAppExample, reactExample, vanillaExample } from "./examples";

const isJsTest = (path: string) => /\.(test|spec)\.[jt]sx?$/.test(path);

export const RUNTIMES: readonly RuntimeAdapter[] = [
  {
    id: "react-app",
    label: "React app (standard src/ layout, Tailwind)",
    description:
      "A standard React app (public/index.html, src/index.js, index.css, App.js, App.css, package.json) styled with Tailwind, with a live preview and in-browser Jest tests.",
    engine: "sandpack",
    template: "react",
    isTestFile: isJsTest,
    entryFile: "/src/App.js",
    exampleProject: reactAppExample,
    standalone: { entry: "/src/index.js" },
  },
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
const VANILLA_SETUP = { environment: "create-react-app" as const };

export function sandpackSetupFor(template: "react" | "vanilla") {
  return template === "vanilla" ? VANILLA_SETUP : undefined;
}

/**
 * The `template` and `customSetup` props for a SandpackProvider running this runtime. A
 * standalone runtime passes no template, so Sandpack uses only the project's own files
 * (no template App.js / index.js / styles.css are added) with the Create React App
 * bundler and the given entry file. Every SandpackProvider must use this.
 */
type ProviderSetup = {
  template: "react" | "vanilla" | undefined;
  customSetup: { environment: "create-react-app"; entry?: string } | undefined;
};
const providerSetups = new Map<string, ProviderSetup>();

/*
 * The returned objects are cached per runtime and must stay the same object between
 * renders: SandpackProvider treats a new `customSetup` object as a new project and resets
 * every file to the starting code. A fresh object per render reset the learner's work
 * whenever the workspace re-rendered (switching preview size, resizing a panel).
 */
export function sandpackProviderSetup(runtime: RuntimeAdapter): ProviderSetup {
  let setup = providerSetups.get(runtime.id);
  if (!setup) {
    setup = runtime.standalone
      ? { template: undefined, customSetup: { environment: "create-react-app", entry: runtime.standalone.entry } }
      : { template: runtime.template, customSetup: sandpackSetupFor(runtime.template) };
    providerSetups.set(runtime.id, setup);
  }
  return setup;
}

/** The template whose untouched boilerplate is dropped when saving, or null when the project is standalone. */
export function boilerplateTemplate(runtime: RuntimeAdapter): "react" | "vanilla" | null {
  return runtime.standalone ? null : runtime.template;
}

export function getRuntime(id: string): RuntimeAdapter | undefined {
  return RUNTIMES.find((runtime) => runtime.id === id);
}
