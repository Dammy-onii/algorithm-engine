# Documentation Index

Start here. The docs are grouped by purpose.

## Orientation
- [CHANGELOG.md](./CHANGELOG.md) — **current feature changes, verification, and
  known limits**. Read this first when resuming work.
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) — what the platform is, in one page.
- [UX_FIRST_GLANCE.md](./UX_FIRST_GLANCE.md) — proposed first-open information
  architecture, progressive disclosure, debugging flow, and implementation
  order for reducing learner confusion.
- [summary.md](./summary.md) — the original long-form vision.
- [ROADMAP.md](./ROADMAP.md) — all 8 milestones: what each proves + how to present it.
- [MILESTONES.md](./MILESTONES.md) — milestone status overview.

## How it works (engine + authoring)
- [BUILD.md](./BUILD.md) — tech stack, how to run, design rules.
- [RULES.md](./RULES.md) — authoring a brain: the six layers, conditions, functions.
- [CODE_MODE.md](./CODE_MODE.md) — **how the Code editor communicates with the
  simulation**, the observation/action lifecycle, Rules interaction, current
  Submit limitation, multilingual runners, and visible/hidden test placement.
- [CHALLENGE_SCHEMA.md](./CHALLENGE_SCHEMA.md) — the world-agnostic challenge schema
  (brief, live task steps, Grade taxonomy) that renders the learner flow for every
  simulation type.
- [ENGINE_LOADING.md](./ENGINE_LOADING.md) — **how data loads into a running sim**,
  the WorldModule system, and the decoupling changelog.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — current end-to-end reference for the
  engine boundary, modules, registries, challenges, content, and routes.
- [CONTENT_ARCHITECTURE.md](./CONTENT_ARCHITECTURE.md) — the plug-and-play content-pack
  plan (file org, world loading, decoupling, migration tiers).

## Milestone design docs
- [MILESTONE2.md](./MILESTONE2.md) — Intelligence Authoring System.
- [MILESTONE3.md](./MILESTONE3.md) — Intelligence Composition (derived conditions, objectives).
- [MILESTONE4.md](./MILESTONE4.md) — Learning & Progression (curriculum).
- [WAREHOUSE_SIMULATION.md](./WAREHOUSE_SIMULATION.md) — the warehouse world design:
  one-picker order processing on a compact factory floor, plus the staged
  constraints reserved for later levels.
- [SUPERMARKET_SIMULATION.md](./SUPERMARKET_SIMULATION.md) — live supermarket
  shelf restocking, customer demand, bot travel, scoring, and curated assets.
- [FINANCE_SIMULATION.md](./FINANCE_SIMULATION.md) — the finance (payment routing)
  world: a non-grid world on the same engine and its complete curriculum.
- [FINANCE_INTERVIEW_TRACK.md](./FINANCE_INTERVIEW_TRACK.md) — the three
  interview-grade problems, real-time orchestration model, hidden suites,
  scoring, and untrusted-code security boundary.
- [PARKING_SIMULATION.md](./PARKING_SIMULATION.md) — the smart-parking operations
  world, sprite-pack mapping, shared runtime contract, and foundational levels.
- [PARKING_INTERVIEW_TRACK.md](./PARKING_INTERVIEW_TRACK.md) — three
  interview-grade automated-facility problems, real-time mechanics, hidden
  submission suites, scoring, and current controller boundary.
- [INTERVIEW_SHARING.md](./INTERVIEW_SHARING.md) — single-stage and compact
  multi-problem share routes, tutorial-first ordering, signed registry
  references, visible/hidden resolution, and persistence limits.
- [MAZE_LEVELS.md](./MAZE_LEVELS.md) — Maze level directory, difficulty policy,
  and the branching-maze authoring reference.

## Progress trackers (resumable checklists)
- [task.md](./task.md) · [PROGRESS.md](./PROGRESS.md) ·
  [PROGRESS_M2.md](./PROGRESS_M2.md) · [PROGRESS_M3.md](./PROGRESS_M3.md) ·
  [PROGRESS_M4.md](./PROGRESS_M4.md)

> These milestone/progress files are historical implementation records. They may
> retain the terminology used at the time (including legacy rule priorities).
> The current behavioural sources of truth are **CHANGELOG**, **RULES**,
> **ARCHITECTURE**, **ENGINE_LOADING**, and the relevant world document.

## Routing & structure
- [ROUTING_AND_STRUCTURE.md](./ROUTING_AND_STRUCTURE.md) — implemented App Router
  routes, current feature-oriented tree, component ownership/reuse rules,
  dependency direction, and navigation verification.
