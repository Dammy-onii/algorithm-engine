# Milestones

Long-term roadmap and the detailed plan for the milestone currently in progress.

## Roadmap overview

The full eight-milestone plan (with how-to and presentation notes) now lives in
[`ROADMAP.md`](./ROADMAP.md). Summary:

| # | Milestone | Goal | Status |
|---|-----------|------|--------|
| **1** | **Core Simulation & Decision Engine** | Prove the observe→decide→act→update→render loop with a data-driven world and brain | **Complete ✅** |
| **2** | **Intelligence Authoring System** | Visual editor for all brain layers; challenge system; compiled output feeds the unchanged engine | **Complete ✅** |
| **3** | **Intelligence Composition** | Users build abstractions — derived conditions, objectives, a personal library | **In progress 🟨** (library pending) |
| **4** | **Learning & Progression** | The curriculum teaches; complexity grows naturally | **In progress 🟨** (core + learner flow shipped; skill-tree/adaptive pending) |
| 5 | Hybrid Authoring | Same intelligence authorable as blocks **or** code | Planned |
| 6 | Multiple Worlds | Prove the engine is domain-agnostic (a different problem, not a harder maze) | **In progress 🟨** (Warehouse Modes 1–4 + **non-grid Finance/Payment Routing** shipped; warehouse non-grid Stage 2 pending) |
| 7 | Real-Time Collaboration | Multiple users co-author one agent | Planned |
| 8 | Competition | Teams compare intelligence live, with scoring + spectating | Planned |

> The whole point of Milestone 1 is that later milestones change only *how instruction
> files are produced* — never the engine. (M6 is the one deliberate exception: it adds
> new engine *capabilities* — new worlds, senses, and actions.)

Detailed design docs: [`MILESTONE2.md`](./MILESTONE2.md), [`MILESTONE3.md`](./MILESTONE3.md).

---

## Milestone 1 — Core Simulation & Decision Engine

### Goal

> Build a reusable simulation engine capable of running a single autonomous agent
> inside a grid-based environment using **externally defined instructions**.

The engine repeatedly: **Observe → Evaluate decision logic → Execute action →
Update world → Render → Repeat** until completion.

### In scope

- A data-driven grid **world** (maze) loaded from files — no hardcoded mazes.
- A single **agent** (robot): position, direction, state, memory, optional energy.
- An **observation system** — the only channel between world and agent.
- A layered **decision engine**: goals → state machine → rules → functions → action.
- A data-driven **brain** loaded from JSON instruction files.
- A **simulation loop** running in real time.
- Simple **rendering** (colored squares): maze, walls, robot, goal.
- A **debug panel** exposing tick, observation, goal, state, rule, function, action,
  memory.
- Ability to swap mazes and brains **without changing engine code**.

### Explicitly out of scope

Visual programming, drag-and-drop editors, multiplayer, networking, authentication,
databases, teams, live streaming, interviews, AI generation, leaderboards.

### Simulation tick lifecycle

```
Read World → Generate Observation → Evaluate Goal → Determine Active State
→ Evaluate Rules → Execute Function → Return Action → Update World → Render → Repeat
```

### Data contracts

**World files** (`world/`)
- `maze.json` — grid dimensions, tile layout, start, goal.
- `entities.json` — agents/objects placed in the world.

**Brain files** (`brain/`)
- `goals.json` — prioritized objectives.
- `states.json` — possible states + the initial state.
- `rules.json` — condition → action/function mappings, grouped by state.
- `functions.json` — reusable named behaviors.
- `memory.json` — initial memory contents.

### Target architecture

```
lib/engine/
├── types.ts                  # shared types: Action, Direction, Tile, Observation…
├── world/
│   ├── grid.ts               # grid math + tile access
│   └── world.ts              # World: state, walls, entities, apply actions
├── decision/
│   ├── observation.ts        # build observation from world + agent
│   ├── goalManager.ts        # pick active goal
│   ├── stateMachine.ts       # pick active state
│   ├── ruleEngine.ts         # evaluate rules for the active state
│   ├── functionExecutor.ts   # run the chosen function
│   └── actionResolver.ts     # orchestrate the full decision pipeline → 1 Action
├── runtime/
│   └── loader.ts             # load + validate world and brain data
└── simulation.ts             # Simulation: owns world+agent+brain, exposes tick()

brain/   goals.json states.json rules.json functions.json memory.json
world/   maze.json entities.json

app/     page.tsx + components (renderer, debug panel, controls) — the only
         Next.js-specific layer; the engine above is framework-agnostic.
```

### Initial (deliberately dumb) behavior

> If no wall ahead, move forward; if wall ahead, turn right.

Poor navigation is fine. The milestone tests the **engine**, not the algorithm.

### Success criteria

- [ ] Maze loaded from configuration.
- [ ] Robot placed into the maze.
- [ ] Robot behavior loaded from external instruction files.
- [ ] Engine continuously generates observations.
- [ ] Decision engine evaluates those instructions.
- [ ] Robot performs actions in real time.
- [ ] World updates correctly after each action.
- [ ] Whole process watchable via simple visual simulation.
- [ ] Different mazes **and** brains load without modifying the engine.

See [`PROGRESS.md`](./PROGRESS.md) for the task-level build tracker.
