# CTRL

CTRL is a simulation engine for solving real operational problems. You design the
decision-making logic that runs a changing system — a maze, a payment router, a
parking facility — and watch it perform, decision by decision, instead of writing a
single static answer.

The same engine serves several audiences:

- **Companies** — the current focus — send candidates a realistic problem shaped
  like their actual work, and see how they think, what they prioritise, and how
  their solution performs before committing to another interview. This is the
  default landing.
- **Education** — schools, bootcamps, and programs use it to teach programming and
  computational thinking, from visual blocks to real code, including AI agents and
  decision logic.
- **Individuals** can open the product directly and take on problems themselves —
  no login required.

The public site and the product are **one Next.js app**. The site pages live in
`features/landing/` and the product in `features/engine/`, sharing one design
system. The `/` home is the **companies** page, `/education` is the other audience
page, and `/app` is the product — open to everyone, no login required. (Login
exists in code but is hidden for now.)

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

- `app/` — thin Next.js route segments and interview APIs. Site routes (`/` =
  companies, `/education`, `/login` [hidden], custom 404; `/companies` redirects to
  `/`), the product entry (`/app`), and the challenge/interview routes.
- `features/landing/` — the public site pages: the `/` home (companies),
  `/education`, `/login`, and the 404 — sharing one design system with the product.
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
