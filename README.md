# CTRL

CTRL is a simulation engine for solving real operational problems. You design the
decision-making logic that runs a changing system — a maze, a payment router, a
parking facility — and watch it perform, decision by decision, instead of writing a
single static answer.

The same engine serves two audiences:

- **Individuals** log in and take on problem statements themselves — building a
  solution as ordered visual policies or a JavaScript controller, running it, and
  keeping a record of the challenges and interviews they've taken.
- **Companies** — the current product focus — send candidates a realistic problem
  shaped like their actual work, and see how they think, what they prioritise, and
  how their solution performs before committing to another interview.

The site reflects this: `/` introduces the engine and both audiences, `/companies`
is the detailed hiring pitch, and `/app` is the product where problems are solved.

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

- `app/` — thin Next.js route segments and interview APIs. Marketing routes (`/`,
  `/companies`), the product entry (`/app`), and the challenge/interview routes.
- `features/landing/` — the marketing site: the `/` home (engine + both audiences)
  and the `/companies` hiring pitch, sharing the product's design system.
- `features/engine/catalogue/` — world and challenge directories (`/app`, `/[pack]`).
- `features/engine/studio/` — challenge authoring and interview workspace.
- `features/engine/simulation/` — shared controls, renderers, and diagnostics.
- `features/engine/{lab,interview,application}/` — Lab, interview flows, shared chrome.
- `lib/engine/` — world-agnostic simulation and registered world modules.
- `lib/authoring/` — visual brain compilation, persistence, and objectives.
- `lib/interview/` — assignment tokens and server-owned hidden evaluation.
- `content/` — immutable worlds, challenges, and example brains.
- `docs/` — architecture, world behaviour, interview, and authoring reference.

Start with [docs/README.md](./docs/README.md), then use
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and
[docs/CHANGELOG.md](./docs/CHANGELOG.md) as the current sources of truth.
