# Algorithm Engine

Algorithm Engine is a generic decision-system simulation platform. Learners and
interview candidates author an agent as ordered visual policies or a JavaScript
controller, then run it inside Maze, Warehouse, Finance, and Parking worlds.

The shared runtime follows one lifecycle:

```text
observe → choose one safe action → update the world → inspect the trace
```

World modules own their domain mechanics while the core engine remains unaware
of packages, payment providers, vehicles, or parking bays.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The production build uses `next/font` and may need network access to retrieve
the configured Google fonts.

## Project map

- `app/` — thin Next.js route segments and interview APIs.
- `features/catalogue/` — world and challenge directories.
- `features/studio/` — challenge authoring and interview workspace.
- `features/simulation/` — shared controls, renderers, and diagnostics.
- `lib/engine/` — world-agnostic simulation and registered world modules.
- `lib/authoring/` — visual brain compilation, persistence, and objectives.
- `lib/interview/` — assignment tokens and server-owned hidden evaluation.
- `content/` — immutable worlds, challenges, and example brains.
- `docs/` — architecture, world behaviour, interview, and authoring reference.

Start with [docs/README.md](./docs/README.md), then use
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and
[docs/CHANGELOG.md](./docs/CHANGELOG.md) as the current sources of truth.
