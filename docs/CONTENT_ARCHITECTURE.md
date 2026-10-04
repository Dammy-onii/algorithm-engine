# Content Architecture — File Organization, World Loading & Engine Decoupling

Plan doc for turning the platform into a **plug-and-play, content-driven runtime**:
the engine is a fixed program; worlds, challenges, scenarios, scoring, tutorials and
starter brains are **versioned content** that can grow (eventually be published
remotely) without redeploying the app.

This is the design contract. Implementation lands in tiers (see the end).

> **Status note.** The examples below use "warehouse" as the illustrative pack.
> The Warehouse world has since been removed; the shipped packs are Simple
> Decisions, Maze, Finance, Parking, and Drone Surveillance. The design applies
> unchanged to any pack.

---

## Original coupling that motivated the design

This plan began when the challenge layer was mostly data but two couplings still
blocked plug-and-play loading:

1. **Challenges are statically bundled, not discovered.** `challenges/index.ts`
   hard-imports every file into an array. Adding a level = editing that file +
   recompiling + redeploying.

2. **The engine was not domain-agnostic.** Warehouse behavior initially lived
   directly in the engine rather than behind a world module. The historical
   coupling was:

   | File | warehouse-specific references |
   |---|---|
   | `world/world.ts` | ~57 |
   | `runtime/loader.ts` | ~35 |
   | `types.ts` | ~34 |
   | `decision/condition.ts` | ~20 |
   | `decision/observation.ts` | ~13 |

   The UI also had warehouse branches in `MazeRenderer` and hardcoded warehouse
   flags in condition controls.

The second problem is now resolved by the `WorldModule` and renderer registries.
The first remains a future content-discovery step: challenges are still bundled
through `content/challenges/index.ts`.

The goal: **adding a level/scenario = adding data; adding a whole new world = adding a
small shipped plugin — never editing the engine core.**

---

## The four layers

```
Engine                 fixed runtime. loop, observe, act, evaluate, score, render-dispatch
  └─ Simulation Pack   a world type (maze, warehouse, traffic…): entities, actions,
                        observation schema, scoring, renderer, tutorials
       └─ Challenge     config within a pack: start world, win conditions, available
                          actions/conditions, starter brain, difficulty, tutorial
            └─ Scenario  same challenge, different data (layout, item positions, battery)
```

Only the **Engine** and the per-pack **behavior plugins** (world module + renderer)
are code. Everything else — packs' manifests, challenges, scenarios, scoring configs,
tutorials, starter brains — is data.

---

## File organization

```
content/
  index.json                     ← catalog: which packs exist, their versions
  maze/
    manifest.json                ← pack descriptor (see schema below)
    worlds/
      straight.json              ← WorldData (grid, start, goal, energy…)
      snake.json
      arena.json
    challenges/
      practice-1-straight.json   ← ChallengeDescriptor (references a world + brain)
      practice-2-corner.json
      …
    brains/
      follower.json              ← starter/sample BrainSource
    tutorials/
      priority.md
  warehouse/
    manifest.json
    worlds/
      first-orders.json
      …
    challenges/
      tutorial-1-first-orders.json
      …
    brains/
      warehouse-sample.json
    scenarios/                   ← optional: variants of a challenge (data only)
      continuous/a.json
      continuous/b.json
```

- **Behavior plugins stay in code** (shipped, versioned with the engine), not in
  `content/`:
  ```
  lib/engine/worlds/
    maze/           world module (createRuntime, applyAction, observation, status)
    warehouse/      world module
  features/engine/simulation/components/renderers/
    WorldRenderer.tsx       renderer registry/dispatcher
    WarehouseRenderer.tsx   warehouse presentation
    FinanceRenderer.tsx     finance presentation
    ParkingRenderer.tsx     parking presentation
  features/engine/simulation/components/
    MazeRenderer.tsx        maze presentation
  ```
  A pack's `manifest.json` references these by **id** (`"renderer": "warehouse"`,
  `"worldModule": "warehouse"`), and the app resolves the id against a registry of
  *known* modules. New data can be published freely; new **modules** ship with an app
  release. This is the security boundary (see below).

### Where content physically lives

- **Phase A (bundled):** `content/` is imported at build time via a generated catalog.
  Still one deploy per new level, but no `switch`/routing edits.
- **Phase B (runtime-local):** `content/` is served from `public/content/` and the app
  `fetch`es it. Dropping a JSON file + updating `index.json` publishes a level — no
  recompile.
- **Phase C (remote):** the loader points at a content host/CDN
  (`GET /content/index.json`, `GET /content/warehouse/challenges/level-27.json`). The
  app is a stable runtime; content updates independently. Daily puzzles, weekend
  challenges, classroom sets, community packs — all just published data.

---

## Manifest & descriptor schemas

**`content/index.json`** — the catalog:

```json
{
  "schema": 1,
  "packs": [
    { "id": "maze",      "path": "maze/manifest.json",      "version": "1.0.0" },
    { "id": "warehouse", "path": "warehouse/manifest.json", "version": "1.2.0" }
  ]
}
```

**`<pack>/manifest.json`** — the Simulation Pack descriptor:

```json
{
  "schema": 1,
  "id": "warehouse",
  "title": "Warehouse Automation",
  "description": "Choose, collect, transport and deliver.",
  "version": "1.2.0",
  "requiresEngine": ">=1.0.0",
  "worldModule": "warehouse",       // resolved against the shipped module registry
  "renderer": "warehouse",          // resolved against the shipped renderer registry
  "actionSet": "warehouse",         // legal actions this world exposes
  "observationSchema": "warehouse", // flags/values the world produces
  "scoring": "warehouse",           // metric set id (or inline scoring config)
  "difficulties": ["practice", "easy", "medium", "hard"],
  "challenges": [
    "challenges/tutorial-1-first-orders.json"
  ]
}
```

**`<pack>/challenges/<id>.json`** — a self-describing Challenge (extends today's
`ChallengeData`, adding the pack/stage/scenario fields):

```json
{
  "schema": 1,
  "id": "warehouse-first-orders",
  "pack": "warehouse",
  "stage": "practice",
  "difficulty": 1,
  "number": 1,
  "name": "First Orders",
  "world": "worlds/first-orders.json",       // ref, not inlined
  "starterBrain": "brains/warehouse-sample.json",
  "narrative": "…",
  "objective": "…",
  "tutorial": "tutorials/first-orders.md",
  "availableBricks": ["pick-small", "deliver", "hold"],
  "availableConditions": ["robotIsPicker", "robotFull", "smallTaskAvailable", "robotCarrying", "always"],
  "functionsUnlocked": false,
  "statesUnlocked": false,
  "objectives": [ { "id": "complete-all", "label": "Complete every order", "check": "reached && allOrdersDone" } ],
  "scenarios": ["scenarios/first-orders/a.json", "…"]   // optional
}
```

Refs (`world`, `starterBrain`, `tutorial`, `scenarios`) are resolved relative to the
pack root by the loader. A **Scenario** file is a partial world/challenge override
merged over its parent challenge — same rules, different data.

---

## World-loading pipeline

```
index.json
  → for each pack: load manifest.json  (validate schema + version)
  → resolve worldModule / renderer / scoring ids against shipped registries
  → build the catalog tree (pack → difficulty → challenge → scenario)

on challenge select:
  → load challenge descriptor
  → load referenced world JSON + starter brain JSON (+ scenario overrides)
  → worldModule.createRuntime(worldData)     → World runtime
  → new Simulation(worldRuntime, brainSource, { module })
  → run loop; renderer = renderers[manifest.renderer]
```

A single loader API the app talks to (no static imports in the UI):

```ts
listPacks(): PackSummary[]
listChallenges(packId): ChallengeSummary[]
loadChallenge(id): Promise<LoadedChallenge>   // world + brain + module + renderer id
```

The loader has one swappable backend: **bundled** (Phase A), **local fetch**
(Phase B), **remote fetch** (Phase C). The rest of the app is unaware which is active.

---

## Engine decoupling — the WorldModule seam

The engine core (`Simulation`, the tick loop, the safe condition evaluator, the
decision pipeline) stays. Everything world-specific moves behind one interface:

```ts
interface WorldModule {
  id: string;                       // "maze" | "warehouse" | …

  /** Build mutable runtime from immutable world data. */
  createRuntime(data: WorldData): WorldRuntime;

  /** The legal actions this world understands. */
  actions: ActionType[];

  /** Apply one action to the runtime (the only place state changes). */
  applyAction(rt: WorldRuntime, action: Action): void;

  /** The observation flags/values this world exposes, for the evaluator + UI. */
  observationSchema: FlagSpec[];    // name, type, label, meaning
  observationContext(rt: WorldRuntime): EvalContext;

  /** Has the run ended, and how? Replaces the maze/warehouse if-branches. */
  resolveStatus(rt: WorldRuntime, cfg: RunConfig): SimStatus;

  /** Metrics this world scores on (feeds objectives). */
  scoring: MetricSpec[];
}
```

Concretely this means:

- **`lib/engine/world/world.ts`** shrinks to a generic grid/agent core. The
  warehouse runtime, `pickUp`/`deliver`/`charge`, `packagesRemaining`, and the
  warehouse status branch move into `lib/engine/worlds/warehouse.ts`. The maze's
  `goalHold` settle logic moves into `lib/engine/worlds/maze.ts`.
- **`ActionType`** stops being a fixed union that lists warehouse actions; the legal
  set comes from the active module (`module.actions`). Primitive *movement* can stay
  a shared base; domain actions are module-owned.
- **`decision/observation.ts` + `decision/condition.ts`** stop hardcoding warehouse
  flags. The evaluation context is assembled from `module.observationContext(rt)`.
- **`ConditionChip` / ConditionEditor** read the flag vocabulary from
  `module.observationSchema` (passed down as data) instead of the hardcoded
  `BOOLEAN_FLAGS`/`NUMERIC_FLAGS` arrays.
- **Rendering** becomes a registry: `renderers[manifest.renderer]`. `MazeRenderer`
  loses its warehouse branches; a `WarehouseRenderer` handles packages/zones/cargo.

The engine then genuinely "only knows how to run a simulation." A new world =
implement a `WorldModule` + a renderer + a `manifest.json`. No edits to the engine
core, the evaluator, or the decision pipeline.

---

## Scoring as data/plugins

Objectives already use the safe evaluator over generic `RunMetrics`. Extend so each
pack declares its metric set (`module.scoring`): warehouse → packages delivered, avg
delivery time, energy used; traffic → avg wait, cars processed, congestion. Objective
`check` expressions reference those metric names. The engine asks the module "how do I
score this run?" and evaluates the pack/challenge objectives against it.

---

## Security & versioning (the data-vs-code line)

- **Data is safe to fetch remotely** — worlds, challenges, scenarios, scoring configs,
  starter brains, tutorials. Conditions/scoring run in the **sandboxed evaluator**
  (no `eval`), and the loader **schema-validates** every file. A malformed or hostile
  level fails to load; it cannot execute code.
- **Behavior is code and must ship with the app** — world modules and renderers. A
  remote pack references them by **id**; the app only resolves ids it already knows.
  Never `eval`/`import()` remote JS. (Community *worlds* therefore require a
  reviewed app release that adds the module; community *levels* for existing worlds
  need no release.)
- **Versioning is independent** (Minecraft model): `index.json` and each
  `manifest.json` carry a `version` and `requiresEngine`. The runtime refuses packs it
  is too old to run and surfaces a clear message, rather than failing obscurely.

---

## Migration plan (tiers, each shippable + green)

- **Tier 1 — Content registry + loader.** Introduce the catalog/registry and a single
  `loadChallenge` API; move the static `challenges/index.ts` array behind it. Bundled
  backend first. No engine change. (Unlocks "add a level without touching routing".)
- **Tier 2 — Pack manifests.** Add `content/index.json` + per-pack `manifest.json`;
  group challenges under pack/difficulty/scenario; drive the UI tree from the manifest.
- **Tier 3 — Engine decoupling.** Introduce `WorldModule`; extract maze + warehouse
  out of `lib/engine/world/world.ts`; make actions/observation/condition-context/render
  module-driven. All existing tests stay green; warehouse behaves identically.
- **Tier 4 — Runtime fetch.** Serve `content/` from `public/` and `fetch` it; add
  loading states. Publishing a level no longer needs a recompile.
- **Tier 5 — Remote + marketplace.** Point the loader at a content host; add pack
  discovery/versioning UI. Daily puzzles, events, community packs.

Do **not** attempt all tiers at once. Each tier keeps the app working and the test
suite green, and only the last two change *where* content lives.

---

## Implementation status

- **Tier 1 — done.** `lib/content/registry.ts` is the single catalog API
  (`listPacks`, `challengesInPack`, `packForChallenge`, `getChallenge`,
  `firstChallengeInPack`). Every challenge now declares its `pack` field, and the
  app groups by it — the old `id.startsWith("warehouse-")` prefix guessing and
  hardcoded catalogue list are gone. Covered by
  `lib/content/__tests__/registry.test.ts`. Verified live: the world picker and
  per-pack challenge lists render from the registry.
- **Tier 2 — not started.** Pack manifests + `content/index.json`.
- **Tier 3 — complete.** `WorldModule` owns domain schema validation, action and
  flag metadata, runtime, observation, and status. `World`, the loader and shared
  types contain no domain behavior; `features/engine/simulation/` dispatches Maze,
  Sorter, Finance, Parking, Drone, and Cargo presentations through a renderer registry.
  Current verification totals are recorded in
  [CHANGELOG.md](./CHANGELOG.md). See
  [ENGINE_LOADING.md](./ENGINE_LOADING.md) for the current detail.
- **Tier 4/5 — not started.** Runtime + remote fetch.
