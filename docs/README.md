# Documentation Index

Start here. The docs are grouped by purpose.

## Orientation
- [CHANGELOG.md](./CHANGELOG.md) — **current feature changes, verification, and
  known limits**. Read this first when resuming work.
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) — what the platform is, in one page.
- [summary.md](./summary.md) — the original long-form vision.
- [ROADMAP.md](./ROADMAP.md) — all 8 milestones: what each proves + how to present it.
- [MILESTONES.md](./MILESTONES.md) — milestone status overview.

## How it works (engine + authoring)
- [BUILD.md](./BUILD.md) — tech stack, how to run, design rules.
- [RULES.md](./RULES.md) — authoring a brain: the six layers, conditions, functions.
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
- [WAREHOUSE_AUTOMATION.md](./WAREHOUSE_AUTOMATION.md) — the warehouse world design.
- [WAREHOUSE_MODES_2_4.md](./WAREHOUSE_MODES_2_4.md) — warehouse stages 2–4.
- [FINANCE_SIMULATION.md](./FINANCE_SIMULATION.md) — the finance (payment routing)
  world: a non-grid world on the same engine, its module, and the first six levels.
- [PARKING_SIMULATION.md](./PARKING_SIMULATION.md) — the smart-parking operations
  world, sprite-pack mapping, runtime contract, and first three levels.
- [MAZE_LEVELS.md](./MAZE_LEVELS.md) — Maze level directory, difficulty policy,
  and the branching-maze authoring reference.

## Progress trackers (resumable checklists)
- [task.md](./task.md) · [PROGRESS.md](./PROGRESS.md) ·
  [PROGRESS_M2.md](./PROGRESS_M2.md) · [PROGRESS_M3.md](./PROGRESS_M3.md) ·
  [PROGRESS_M4.md](./PROGRESS_M4.md) · [PROGRESS_WAREHOUSE.md](./PROGRESS_WAREHOUSE.md)

> These milestone/progress files are historical implementation records. They may
> retain the terminology used at the time (including legacy rule priorities).
> The current behavioural sources of truth are **CHANGELOG**, **RULES**,
> **ARCHITECTURE**, **ENGINE_LOADING**, and the relevant world document.

## Routing & structure
- [ROUTING_AND_STRUCTURE.md](./ROUTING_AND_STRUCTURE.md) — implemented App Router
  routes, current feature-oriented tree, component ownership/reuse rules,
  dependency direction, and navigation verification.
