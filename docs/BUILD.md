# Build & Architecture

How the project is built, the tech stack, and how to run it.

## Tech stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | **Next.js 16.2.11** (App Router) | ⚠️ This version has breaking changes vs. older Next — see [`AGENTS.md`](../AGENTS.md). Consult `node_modules/next/dist/docs/` before writing framework code. |
| UI | **React 19.2** | Client Components (`'use client'`) for the interactive simulation. |
| Language | **TypeScript 5** (strict) | Engine is plain, framework-agnostic TS. |
| Styling | **Tailwind CSS v4** | Via `@tailwindcss/postcss`. |
| Runtime | Browser | The whole Milestone-1 simulation runs client-side. |

## Layering principle

The **engine is framework-agnostic**. Nothing under `lib/engine/` imports React or
Next. The engine could be lifted into a Node CLI, a worker, or a test harness
unchanged. Next.js routes live in `app/`; React product UI lives in `features/`
and `shared/`.

```
┌───────────────────────────────────────────────┐
│ app/ + features/ + shared/  (Next.js + React)│
│ routes        feature UI       shared UI      │
└────────────────────────┬──────────────────────┘
                        │ imports
┌───────────────────────▼────────────────────┐
│ lib/engine/  (pure TypeScript)             │
│   simulation • world • decision • runtime  │
└───────────────────────┬────────────────────┘
                        │ loads (data only)
┌───────────────────────▼────────────────────┐
│ content/brains/*/*.json   content/worlds/* │
└────────────────────────────────────────────┘
```

## Directory map

See [`MILESTONES.md`](./MILESTONES.md#target-architecture) for the full engine tree.
Top level:

```
app/                  Next.js App Router segments, layout and global CSS
features/             Product UI grouped by application capability
shared/               Cross-feature reusable UI
assets/               Source artwork imported by feature components
content/worlds/       World/maze definitions — authored data
content/brains/       Agent instruction files — authored data
content/challenges/   Challenge descriptors — authored data
lib/engine/           Framework-agnostic simulation & decision engine
lib/content/          Shared dataset and content-catalog APIs
docs/                 This documentation
public/               Static assets
```

## Running

Dev server:

```bash
npm run dev
```

Then open http://localhost:3000 and press **Start** to run the simulation.

Production build / lint:

```bash
npm run build
npm run lint
```

## Design rules (do not violate)

1. **The engine never hardcodes a world or a brain.** Both come from data files.
2. **The agent never touches the world directly.** It only receives observations and
   returns one action per tick.
3. **The decision pipeline is one-directional:** goals → state → rules → functions →
   action. Each layer is independently testable.
4. **The engine doesn't know *why* an action was chosen** — only *what* was returned.
5. **Rendering is for debugging/validation**, not polish. Colored squares are fine.

## Conventions

- Engine code: pure functions and small classes; no side effects outside `World`.
- Route files stay thin; interactive behavior belongs to its owning feature.
- Cross-feature UI belongs in `shared/`, not in an unrelated feature folder.
- `features/application/` provides stateless shared page chrome; it must not own a
  route enum, simulation timer, or feature state.
- Keep reusable non-React policy in a feature-level module rather than burying it
  inside a component.
- Types live in `lib/engine/types.ts` and are shared across layers.
- JSON data files are validated on load by `runtime/loader.ts`; a bad file should
  fail loudly, not silently.
