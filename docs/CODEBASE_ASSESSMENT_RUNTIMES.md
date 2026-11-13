# Codebase Assessments — Runtime Adapters

A **runtime adapter** tells CTRL how to author, run and test one kind of project.
The candidate editor, snapshots, storage and dashboard never mention a specific
framework; they only use the adapter. Each assessment stores a `runtimeId`.

Source: `lib/assessment/runtime/` (`types.ts`, `registry.ts`, `examples.ts`).

## Contract

```ts
interface RuntimeAdapter {
  id: string;                       // stored on assessments; never rename
  label: string;                    // shown in the authoring dropdown
  description: string;
  engine: "sandpack";               // how the workspace executes the project
  template: "react" | "vanilla";    // Sandpack template for that engine
  isTestFile: (path: string) => boolean;   // which files are visible tests
  entryFile: string;                // file opened first in the editor
  exampleProject: () => { files; hiddenTests; scenario };
}
```

## Adapters shipped

| id | Stack | Template | Tests |
|---|---|---|---|
| `react-js` | React 18, JavaScript | Sandpack `react` | `*.test.js` / `*.spec.js` (Jest, in browser) |
| `vanilla-js` | Plain JavaScript and HTML | Sandpack `vanilla`, run on the `create-react-app` environment | same |

The ids are stored in saved assessments, so they must stay stable.

## How the workspace uses an adapter

- `template` configures `SandpackProvider`, which supplies the bundler, preview
  and Jest runner for that stack.
- `sandpackSetupFor(template)` (`runtime/registry.ts`) picks the bundler
  environment, and every `SandpackProvider` (the workspace and the new-tab preview)
  must pass it as `customSetup`. The `vanilla` template's own bundler ships an old
  Babel that rejects `??`, `?.`, `??=`, class fields and numeric separators in both
  preview and tests, and a `.babelrc` can't fix it (it either can't install plugins
  or doesn't change the parser). Vanilla projects therefore run on the
  `create-react-app` environment, which handles plain JavaScript and a root
  `index.html` too. The candidate's files are unchanged.
- The assessment's files are passed as the project. Sandpack adds its own
  template boilerplate (`/index.js`, `/styles.css`, `/package.json`, …). When
  saving, the workspace **drops boilerplate the candidate never touched** (it
  compares against the template defaults) so snapshots show only real changes.
  Files the author included, and any boilerplate the candidate edited, are kept.
- `entryFile` is opened first when it exists in the project.
- `isTestFile` marks test files in the authoring UI and is where a stack with
  different test naming plugs in.

## Adding a stack

**Another Sandpack template** (Vue, Svelte, Angular, Solid, `react-ts`, `vanilla-ts`,
…): add a registry entry and an example, extending the `template` union in
`runtime/types.ts`.

```ts
{
  id: "react-ts",
  label: "React (TypeScript)",
  description: "React 18 with TypeScript, a live preview and in-browser Jest tests.",
  engine: "sandpack",
  template: "react-ts",
  isTestFile: (p) => /\.(test|spec)\.[jt]sx?$/.test(p),
  entryFile: "/App.tsx",
  exampleProject: reactTsExample,
}
```

Checklist: a unique stable `id`; an example whose starter has at least one failing
visible test; a hidden test file; a check that the snapshot filter
(`collectProjectFiles` in `features/assessment/workspace/collect.ts`) works with
that template's default files; and a browser check that modern syntax (`??`, `?.`,
class fields) works in its tests and preview. If it doesn't, add the template to
`sandpackSetupFor`.

**A different execution engine** (server-side containers for Python, Java, Go, a
database, real APIs): `engine` is a union so a new value can be added. The work is:

1. A new workspace component for that engine that renders the same file explorer
   and editor, and reports run events through the same save API
   (`PUT …/sessions/<id>` with `reason: "run"`).
2. A choice between the workspace components in `AssessmentWorkspace.tsx`, based on
   `adapter.engine`.
3. A server-side run endpoint and sandbox. Nothing else changes: autosave,
   snapshots, submit, storage and review already work on plain `path → text` file
   maps.

## Limits

- Sandpack projects are JavaScript-ecosystem only (npm dependencies resolve
  through its bundler).
- **What tests can use** (checked in the browser): JSX in React test files,
  `react-dom/server` (`renderToStaticMarkup`), CSS imported by the code under test
  (the rules, `@media` included, are in `document.styleSheets`, though jsdom does not
  lay them out), and `import text from "!raw-loader!./file"` to read any project file
  as text.
- **Styling:** `.css`, `.module.css`, `.scss` and `.less` work in both stacks.
  `<script>` tags in `index.html` are not executed, so CDN libraries such as
  Tailwind must be added from JavaScript (`document.head.appendChild(script)`).
- Files are text only; the per-assessment limits are 200 files, 200 KB per file and
  1.5 MB total (`lib/assessment/files.ts`).
