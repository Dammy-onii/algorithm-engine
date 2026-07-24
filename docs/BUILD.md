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
unchanged. Next.js only provides the *rendering shell and controls* in `app/`.

```
┌────────────────────────────────────────────┐
│ app/  (Next.js + React — rendering shell)  │  ← the ONLY framework layer
│   page.tsx, renderer, debug panel, controls│
└───────────────────────┬────────────────────┘
                        │ imports
┌───────────────────────▼────────────────────┐
│ lib/engine/  (pure TypeScript)             │
│   simulation • world • decision • runtime  │
└───────────────────────┬────────────────────┘
                        │ loads (data only)
┌───────────────────────▼────────────────────┐
│ brain/*.json   world/*.json  (data)        │
└────────────────────────────────────────────┘
```

## Directory map

See [`MILESTONES.md`](./MILESTONES.md#target-architecture) for the full engine tree.
Top level:

```
app/            Next.js App Router UI (client simulation shell)
lib/engine/     Framework-agnostic simulation & decision engine
brain/          Agent instruction files (the "brain") — data
world/          World/maze definitions — data
docs/           This documentation
public/         Static assets
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
- Types live in `lib/engine/types.ts` and are shared across layers.
- JSON data files are validated on load by `runtime/loader.ts`; a bad file should
  fail loudly, not silently.
