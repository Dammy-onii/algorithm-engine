# Architecture Reference — Engine, Domains, Content, and Challenges

This is the current technical reference for Algorithm Engine. It describes the
runtime as it is implemented today, including the boundary between the generic
simulation engine and a world-specific domain such as Warehouse Automation.

The central rule is simple:

> The engine executes data. It does not contain a particular maze, warehouse
> layout, challenge solution, or user-authored brain.

That rule makes a new **level** primarily a content change, and a new **kind of
world** a small module addition rather than a simulation rewrite.

---

## 1. The architecture at a glance

```text
authored content                         framework-independent runtime

content/challenges/*.json ─┐
content/worlds/*.json      ├─► content + dataset registries ─► Simulation
content/brains/*/*.json    ┘                                  │
                                                        observe → decide
                                                              → act → snapshot
                                                                    │
                                              AppShell / Studio / Lab / renderer
```

There are four distinct concerns. They should not be conflated:

| Concern | Owns | Main locations |
|---|---|---|
| **Authored content** | Grid layouts, sample brains, challenge text/scaffolds | `content/` |
| **Engine** | The tick lifecycle, safe rule evaluation, base grid movement | `lib/engine/` |
| **World module** | Behaviour unique to one domain: warehouse packages or maze completion | `lib/engine/worlds/` |
| **Application** | URLs, persistence, editor interactions, rendering | `app/` |

The engine imports neither React nor Next.js. The application imports the engine;
the engine never imports application components.

### Optional object-oriented controller seam

Alongside the data-driven `BrainSource`, `Simulation` accepts an optional
`AgentController`. Its `decide(observation)` method is invoked once per tick and
returns one primitive action. This is the code-authoring seam for technical
interviews and hackathons: users can implement a stateful strategy class while
the engine continues to own safety checks, world mutation, deterministic ticks,
debug traces, and objective grading.

```text
fresh Observation ─► controller.decide(observation) ─► validated action ─► World.apply
```

Visual rules and a controller are alternative decision sources, never competing
ones. The controller replaces rule selection for that run; world modules and the
rest of the tick lifecycle remain unchanged.

---

## 2. Data contracts and mutability

The engine accepts exactly two immutable input contracts.

### `WorldData`

`WorldData` describes the environment: dimensions, tiles, start/goal, optional
energy, and a `kind`. A warehouse world additionally carries a static
`warehouse` configuration: capacity, delivery zones, packages, replenishing
stations, and charging stations.

Its TypeScript definition lives in `lib/engine/types.ts`; the JSON files live in
`content/worlds/`.

`WorldData` is source material. It is never mutated during a run.

### `BrainSource`

`BrainSource` describes the agent's six layers:

```text
goals → states → rules → functions → derived conditions → memory
```

- **Goals** select the highest eligible intent.
- **States** retain the current mode of operation.
- **Rules** are an authored, guarded decision flow: the first matching safe rule
  in file order selects the response.
- **Functions** expand a named action or multi-step plan.
- **Derived conditions** name combinations of observable facts.
- **Memory** supplies initial agent memory.

Studio works with a visual representation, compiles it with
`lib/authoring/brainCompiler.ts`, then gives the resulting `BrainSource` to the
same engine that Lab uses for handwritten JSON.

### The mutable run

`World` in `lib/engine/world/world.ts` is the only object that changes while a
simulation runs. It owns:

- generic grid state (`tiles`, dimensions, start/goal);
- the agent's position, direction, state, memory, energy, visited tiles and cargo;
- tick count, terminal status, last blocked move and goal-hold bookkeeping;
- the selected `WorldModule` and its opaque mutable `domain` runtime.

The source data remains reusable: `Simulation.reset()` constructs a new `World`
from the same `WorldSource` and compiled brain.

---

## 3. Loading a runnable simulation

```text
ChallengeData.worldKey
       │
       ▼
app/lib/datasets.ts ──► WorldSource { world, entities }
       │
VisualBrain ──► compileBrain() ──► BrainSource
       │                              │
       └──────────── new Simulation(worldSource, brainSource)
                                      │
                buildBrain()          │          buildWorld()
                - validate functions  │          - validate grid/domain data
                - validate conditions │          - construct World
                - compile plans       │          - resolve WorldModule
                                      ▼
                                ready-to-tick Simulation
```

`lib/engine/runtime/loader.ts` is deliberately strict. It rejects malformed
grids, out-of-bounds start/goal tiles, bad warehouse zone/package/station data,
unknown functions, duplicate function IDs, recursive function plans, invalid
conditions, bad state references, and circular derived conditions before a run
starts. This makes authoring errors appear on **Apply & Run**, not half-way through
a tick loop.

`app/lib/datasets.ts` is the bundled demonstration registry. It maps stable keys
such as `warehouse-energy-management` to imported JSON and shared entity data.
Challenges reference those stable keys rather than importing world files directly.

---

## 4. One simulation tick

`Simulation.tick()` in `lib/engine/simulation.ts` performs one action only.

```text
1. Observe   buildObservation(world)
2. Decide    controller `decide(observation)`, when Code mode is active;
             otherwise goal → state → first matching safe rule in authored order → function plan
3. Act       execute one primitive from the active plan through world.apply(...)
4. Evaluate  energy, completion, stuck/max-tick limits
5. Snapshot  return observation, trace, status, memory and goal-hold progress
```

Multi-step functions are resumable plans. The engine selects the rule once and
executes one primitive per tick. Before every next primitive it takes a fresh
observation; if that primitive is unsafe, it interrupts the remaining plan and
returns to the first rule in the flow. This preserves reusable behaviours without
letting a stale plan move through a newly blocked route.

### Observation is the agent's only sensory channel

`decision/observation.ts` generates common grid facts: walls, neighboring tile
kinds, line-of-sight to the goal, visits, energy, position, direction and tick.
The agent has no direct reference to `World`.

`decision/condition.ts` turns that observation into a plain numeric/boolean
evaluation context. It uses a small parser rather than JavaScript `eval`, supports
boolean operators and comparisons, and resolves derived conditions recursively.

---

## 5. World modules and the domain seam

The generic engine cannot know what a package or charging station means. That
behaviour lives behind `WorldModule` in `lib/engine/worlds/module.ts`.

```ts
interface WorldModule {
  id: string;
  domainActions: readonly string[];
  domainFlags: readonly DomainFlagSpec[];
  validate(data: WorldData): void;
  createDomain(data: WorldData): unknown;
  applyAction(world: World, action: Action): boolean;
  resolveStatus(world: World): SimStatus | null;
  observe(world: World): Record<string, number | boolean>;
}
```

The methods have a precise contract:

| Method | Responsibility |
|---|---|
| `validate` | Validates this module's extension of the common grid schema. |
| `createDomain` | Builds mutable domain state from immutable `WorldData`; maze returns `null`. |
| `applyAction` | Handles only domain actions and returns `true`; `false` delegates to generic move/turn/wait handling. |
| `resolveStatus` | Returns a domain terminal status or `null` to allow the generic energy/running rules. |
| `observe` | Supplies the domain facts that rules, debug UI, and renderers may read. |
| `actionPreconditions` | Optional hard-safety guards. They skip actions that cannot be attempted (such as walking into a wall); they must not encode merely undesirable or risky outcomes. |
| `domainActions` | Documents the domain actions beyond the shared base primitives. |
| `domainFlags` | Supplies names, types, labels, and meanings to validation and Studio. |

`World` resolves the module once from `data.kind`, stores `domain`, then delegates
domain actions, completion, and observations to that module. The loader validates
the common grid and then calls that module's `validate`. `Simulation`, the condition
evaluator, and the decision pipeline do not branch on a particular world type.

### Maze module

`lib/engine/worlds/maze.ts` has no mutable domain state and no domain actions. Its
one domain rule is completion: the agent must occupy the goal for
`goalHoldTicks` consecutive ticks.

### Warehouse module

`lib/engine/worlds/warehouse.ts` owns warehouse-only behaviour:

- Creates mutable runtime packages with `waiting`, `carried`, or `delivered`
  status.
- Exposes one package at each replenishing station and replaces it after pickup
  while stock remains.
- Implements `pickUp`, `deliver`, and `charge`.
- Enforces cargo capacity and type-compatible delivery zones.
- Reports completion only once every package has been delivered.
- Produces flags such as `packageHere`, `carryingRed`, `packagesRemaining`,
  `chargingHere`, and station stock counters.

Those flags are returned in `Observation.domain`. The common evaluator spreads that
bag into its context, so a warehouse rule can write `packageHere && !carryingPackage`
without the evaluator gaining warehouse-specific code.

### Registry of shipped modules

`lib/engine/worlds/registry.ts` maps known `WorldData.kind` values to modules:

```text
"maze"      → mazeModule
"warehouse" → warehouseModule
missing kind → mazeModule
```

Only shipped modules can be resolved. Content may select a known module ID, but it
cannot inject executable behaviour. `allDomainFlags()` supplies the known domain
vocabulary to load-time condition validation.

### Decoupling status

The shared `WorldData` now contains only common grid/agent data. Warehouse schema
types and validation live in `worlds/warehouse.ts`; `ActionType` is an open action
identifier with shared `BASE_ACTIONS` plus actions collected from registered modules.
`World` no longer exposes warehouse helpers: renderers and tests use the warehouse
module's public queries directly.

Function plans are checked a second time when a `World` is built: a plan may use
only the base actions and actions declared by that world's active module. This keeps
the open action identifier extensible without allowing a warehouse action to run in
a maze.

Each module declares typed `domainFlags`, and the registry derives both the known
condition vocabulary and editor metadata from every registered module. Studio's
condition controls therefore do not maintain a warehouse-specific flag list.

The application dispatches boards and legends through
`app/components/renderers/WorldRenderer.tsx`: `MazeRenderer` is maze-only and
`WarehouseRenderer` owns package, zone, station, and charger rendering. The debug
panel is generic and shows whatever facts the active module observed.

Adding a new world still requires its reviewed module and renderer to be registered
with the application. That is the intended security boundary; authored content
cannot supply executable code.

---

## 6. Content, pack, challenge, and curriculum registries

Several registries exist because they answer different questions.

| Registry | Question it answers | Source |
|---|---|---|
| World-module registry | “Which executable domain behaviour is allowed?” | `lib/engine/worlds/registry.ts` |
| Dataset registry | “Which bundled world/brain source has this key?” | `app/lib/datasets.ts` |
| Content registry | “Which packs and challenges are available?” | `lib/content/registry.ts` |
| Challenge registry | “What does this authored challenge contain?” | `content/challenges/index.ts` |
| Curriculum registry | “What is unlocked and what concept does it teach?” | `lib/curriculum/concepts.ts` |

### Content registry

`lib/content/registry.ts` exposes the application-facing catalog API:

- `listPacks()` for the home picker;
- `findPack(packId)` for validation;
- `challengesInPack(packId)` for the Studio path;
- `firstChallengeInPack(packId)` for `/[pack]`;
- `getChallenge(id)` for strict lookups.

`getChallenge` deliberately returns `undefined` for an unknown ID. The older
`findChallenge` helper in the challenge index retains a first-challenge fallback
for existing editor/test callers; it must not be used for route validation.

### Challenge data

Each JSON descriptor in `content/challenges/` is self-contained presentation and
authoring metadata. Its `pack` groups it, `worldKey` resolves its environment,
`scaffoldBrain` starts Studio, and its available bricks/conditions and unlock flags
shape the editor. Objectives are evaluated after a run; only non-bonus objectives
gate completion.

`AppShell` persists a user's visual brain under `ae-brain-<challenge-id>` and
completion under `ae-complete-<challenge-id>` in `localStorage`. Persistence stays
keyed by challenge ID, so routing does not change saved work.

Visual brains may also contain editor-only rule-folder metadata. Folders are saved
with the visual brain and let users categorise large rule sets, but the compiler
omits them from `BrainSource`; engine behaviour remains governed by each rule's
condition and its global top-to-bottom order.

### Curriculum

`lib/curriculum/concepts.ts` maps each teaching challenge to a concept and that
concept's prerequisites. A challenge is open only when the teaching challenges for
all prerequisite concepts are complete. The maze and warehouse paths intentionally
have separate first practice challenges.

---

## 7. Current authored-content layout

```text
content/
  worlds/                immutable maze and warehouse layouts + shared entities
  brains/
    default/             sample maze follower
    naive/               deliberately limited sample
    dash/                multi-step-brick sample
    warehouse/           sample warehouse worker
  challenges/            challenge descriptors and bundled challenge index
lib/
  engine/                framework-independent runtime and world modules
  content/               pack/challenge catalog API
  authoring/             Studio compiler, decompiler and objective evaluator
  curriculum/            progression graph
app/
  components/AppShell.tsx route-driven client workspace
  [pack]/…               thin validated route segments
  lab/                   raw JSON harness route
```

The imports are still bundled at build time. This layout is the Phase A base for
the future content-loader design: replacing bundled imports with local or remote
fetching should not change the engine, Studio, or route contracts.

---

## 8. Route ownership

The App Router owns what screen is displayed:

```text
/                       world picker
/maze                   validated maze level directory, grouped by difficulty
/warehouse              validated warehouse level directory, grouped by difficulty
/[pack]/[challenge]     one validated, shareable Studio challenge
/lab                    raw JSON engine harness
```

Thin server route pages validate the `pack` with `findPack` and the challenge with
strict `getChallenge`; a challenge must also belong to the requested pack. Invalid
paths call `notFound()`.

`AppShell` remains a client component because it owns timers, local storage,
authoring state, and simulation controls. It receives only validated route props.
Selecting a pack or challenge uses `router.push`, so browser back/forward and copied
URLs are meaningful. Route pages key the shell by selected route, deliberately
resetting transient engines and timers while restoring the persisted brain for the
new challenge.

For the detailed routing implementation and verification notes, see
[ROUTING_AND_STRUCTURE.md](./ROUTING_AND_STRUCTURE.md).

---

## 9. Safe extension recipes

### Add a maze or warehouse level

1. Add a `WorldData` JSON file under `content/worlds/`.
2. Add it to `app/lib/datasets.ts` with a stable `worldKey`.
3. Add a challenge descriptor in `content/challenges/` and import it from that
   directory's index.
4. Give the challenge a known `pack`, available editor vocabulary and objectives.
5. Add a curriculum concept if it teaches a new progression step.
6. Run TypeScript and the tests.

No engine tick-loop edits are required.

### Add a new world type

1. Implement `WorldModule` under `lib/engine/worlds/`.
2. Register it in `lib/engine/worlds/registry.ts`.
3. Add data schema/validation and a renderer integration.
4. Add content and challenge data that select the module by `WorldData.kind`.
5. Add engine and authored-challenge tests.

Its schema, validation, action vocabulary, condition metadata, and renderer stay
with the new module. The shared engine only needs its normal registry entry.
