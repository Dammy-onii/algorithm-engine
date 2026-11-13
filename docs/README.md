# Documentation Index

Start here. The docs are grouped by purpose.

## Orientation
- [CHANGELOG.md](./CHANGELOG.md) — **current feature changes, verification, and
  known limits**. Read this first when resuming work.
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) — what the platform is, in one page.
- [UX_FIRST_GLANCE.md](./UX_FIRST_GLANCE.md) — the original first-open
  information-architecture proposal. The shipped onboarding is the on-screen
  tour described in [CHANGELOG.md](./CHANGELOG.md).
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

## Shipped worlds

The catalogue, in order: **Simple Decisions, Maze, Finance, Parking, Drone
Surveillance, Warehouse**. The current Warehouse world (one 3D level, see the
CHANGELOG) is a new build; the older grid Warehouse and the Supermarket world
were removed, and older docs below may still describe them.

- [DECISIONS_SIMULATION.md](./DECISIONS_SIMULATION.md) — the beginner sorting
  desk: one generic module, three tutorial levels (Even or Odd, Prime or Not,
  Fragile Parcels).
- [MAZE_LEVELS.md](./MAZE_LEVELS.md) — Maze level directory, difficulty policy,
  and the branching-maze authoring reference.
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
- **Drone Surveillance** (search and cargo modules) — documented in
  [ARCHITECTURE.md](./ARCHITECTURE.md) under "Drone module" and "Cargo module".
- [INTERVIEW_SHARING.md](./INTERVIEW_SHARING.md) — single-stage and compact
  multi-problem share routes, tutorial-first ordering, signed registry
  references, visible/hidden resolution, and persistence limits.

## Milestone design docs

## Codebase assessments

A second assessment type: candidates work in a real project in the browser and
CTRL records how their code changes.

- [CODEBASE_ASSESSMENTS.md](./CODEBASE_ASSESSMENTS.md) — overview: the three
  roles (company, candidate, reviewer), code map, decisions, and known limits.
- [CODEBASE_ASSESSMENT_RUNTIMES.md](./CODEBASE_ASSESSMENT_RUNTIMES.md) — runtime
  adapters and how to add a framework or language.
- [CODEBASE_ASSESSMENT_REVIEW.md](./CODEBASE_ASSESSMENT_REVIEW.md) — process
  capture, snapshots, derived stats, the reviewer dashboard and rubric.
- [CODEBASE_ASSESSMENT_API.md](./CODEBASE_ASSESSMENT_API.md) — routes, storage
  interface, signed links, session rules and the hidden-test runner.
- [CODEBASE_PROBLEM_TESTS.md](./CODEBASE_PROBLEM_TESTS.md) — what each code
  problem's tests check, how the Tailwind responsive tests work, the unit tests, and
  how they were verified.

- [MILESTONE2.md](./MILESTONE2.md) — Intelligence Authoring System.
- [MILESTONE3.md](./MILESTONE3.md) — Intelligence Composition (derived conditions, objectives).
- [MILESTONE4.md](./MILESTONE4.md) — Learning & Progression (curriculum).

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
