# Engine Data Loading & World Modules

How the engine turns **data** (content, worlds, brains) into a **running
simulation**, and how the world-type-specific behaviour is kept out of the engine
core via **world modules**. This is the reference for the loading pipeline and the
Tier 3 decoupling refactor.

- Companion: [CONTENT_ARCHITECTURE.md](./CONTENT_ARCHITECTURE.md) (the file-org +
  content-pack plan). This doc is the *engine-side* detail of that plan.

---

## The two data contracts

Everything the engine runs is data in one of two shapes:

- **`WorldData`** — the environment (grid dimensions, tiles, start/goal, optional
  energy, and an optional `kind` + world-type config such as `finance`).
- **`BrainSource`** — the six-layer agent intelligence (goals, states, rules,
  functions, conditions, memory).

The engine never contains a specific world or brain. It loads these and executes
them. That invariant is the whole platform.

---

## The load pipeline (data → running simulation)

```
Content registry            lib/content/registry.ts
  listPacks()               "what worlds exist?"          (catalog, Tier 1)
  challengesInPack(pack)    "what challenges are inside?"
  getChallenge(id)          ChallengeData  ─────────────┐
                                                        │  references
                          worldKey ─► datasets.WORLDS ──┤─► WorldSource { WorldData, entities }
                          scaffoldBrain / VisualBrain ──┘
                                    │ compileBrain (visual Studio) / controller (Code mode) / raw JSON (Lab)
                                    ▼
                              BrainSource
                                    │
          new Simulation(worldSource, brainSource, { controller?, goalHoldTicks })
                                    │
             ┌──────────────────────┴───────────────────────┐
             ▼                                               ▼
        buildBrain(...)                                 buildWorld(...)
   runtime/loader.ts                                 runtime/loader.ts
   - compile function plans                           - validate world data
   - compile + validate derived conditions            - new World(data, …)
   - validate rule/goal expressions against              │
     BUILTIN_FLAGS ∪ allDomainFlags() ∪ derived          ▼
             │                                        World constructor
             ▼                                        - resolveWorldModule(data.kind)
           Brain                                      - module.createDomain(data) → domain runtime
             └───────────────┬──────────────────────────────┘
                             ▼
                        Simulation.tick()   (the loop)
```

Where things live:

| Concern | File |
|---|---|
| Content catalog (packs → challenges) | `lib/content/registry.ts` |
| World + brain registries (bundled data) | `lib/content/datasets.ts`, `content/challenges/index.ts` |
| Load + validate brain, build world | `lib/engine/runtime/loader.ts` |
| The simulation loop | `lib/engine/simulation.ts` |
| Generic world state | `lib/engine/world/world.ts` |
| **World-type behaviour (the seam)** | `lib/engine/worlds/*` |

---

## One tick, in detail

```
Simulation.tick():
  observation = buildObservation(world)
      base facts (walls, goal visibility, energy, position…)
      + domain facts:  observation.domain = world.module.observe(world)
  decision   = controller.decide(observation)               ← Code mode
           OR resolveAction(brain, observation, agent.state) ← visual / JSON mode
      rule context = base flags + { ...observation.domain }
      visual path: goal → state → ordered rule → function → plan
  world.apply(action):
      handled = world.module.applyAction(world, action)     ← domain actions (pickUp…)
      else base movement (moveForward / turnLeft / turnRight / wait)
      energy--, tick++
      status = world.module.resolveStatus(world) ?? (energy≤0 ? out-of-energy : running)
  snapshot(step)  → UI (renderer + debug panel)
```

The engine core (`simulation.ts`, `observation.ts`, `condition.ts`, the decision
pipeline) is **domain-agnostic** — it only ever talks to `world.module`.

### Code-mode controller contract

`SimulationConfig.controller` is optional. When supplied, it replaces the visual
rule decision path for that run:

```ts
interface AgentController {
  decide(observation: Readonly<Observation>): ActionType;
  reset?(): void;
}
```

The controller is called once per tick and may retain algorithm state in instance
fields. It cannot mutate `World`; the simulation validates the returned action,
converts a physically unsafe action to `wait`, applies exactly one action, then
updates status and traces. `reset()` is invoked by `Simulation.reset()` when
present. Studio evaluates its local JavaScript authoring source only after Apply
& Run; deployment isolation is an application-hosting responsibility.

---

## The WorldModule system

A `WorldModule` (`lib/engine/worlds/module.ts`) is everything world-type-specific:

```ts
interface WorldModule {
  id: string;                                   // matches WorldData.kind
  readonly tracksMovement?: boolean;            // false = non-grid; skip idle-stuck
  readonly domainActions: readonly string[];    // actions beyond base movement
  readonly domainFlags: readonly DomainFlagSpec[];
  readonly actionPreconditions?: Record<string, string>; // action → possible-when expr
  validate(data: WorldData): void;              // domain schema validation
  createDomain(data: WorldData): unknown;       // build mutable runtime (or null)
  applyAction(world, action): boolean;          // handle domain actions; false = base
  resolveStatus(world): SimStatus | null;       // completion, or null to defer
  observe(world): Record<string, number|boolean>; // domain observation flags
}
```

Two optional capabilities keep world-type concerns out of the engine core:

- **`tracksMovement`** — the engine's "no newly-visited tile for N ticks ⇒ stuck"
  heuristic is movement-based. Non-grid worlds (finance) set this `false` and own
  termination via `resolveStatus`; grid worlds omit it (defaults true).
- **`actionPreconditions`** — action → condition expression describing when the
  action is *physically impossible*. The decision layer skips the earlier rule
  whose action is impossible and continues through the ordered flow, so an
  impossible action never wins over a possible one. See the
  execution-workflow section in [RULES.md](./RULES.md).

Shipped modules (`lib/engine/worlds/`):

- **`maze.ts`** — no domain runtime, no domain actions. Its only behaviour is
  completion: *settle on the goal* for `goalHoldTicks` consecutive ticks
  (tracked as `world.ticksAtGoal`). `observe()` returns `{}`.
- **`sorter.ts`** — a **non-grid** beginner world (`tracksMovement: false`): a
  queue of items, two labelled blocks, `sendToA` / `sendToB` actions, a
  content-supplied `binARule` that decides each item's correct block, and
  computed yes/no facts (`isEven`, `isOdd`, `isPrime`, `isFragile`). See
  [DECISIONS_SIMULATION.md](./DECISIONS_SIMULATION.md).
- **`finance.ts`** — a **non-grid** world (`tracksMovement: false`): a transaction
  queue + provider health as the runtime, `routeTo{A,B,C}` / `hold` / `decline`
  actions with seeded (reproducible) outcomes, completion (*queue drained*), and
  the payment/provider observation bag. See [FINANCE_SIMULATION.md](./FINANCE_SIMULATION.md).
- **`parking.ts`** — a **non-grid** world (`tracksMovement: false`): scheduled
  arrivals + typed parking spaces as the runtime, category allocation actions,
  explicit exit requests + user-authorized departures, space reuse,
  compatibility violations, entry/exit wait and utilization metrics, and
  completion after every vehicle leaves. See
  [PARKING_SIMULATION.md](./PARKING_SIMULATION.md).
- **`drone.ts`** and **`cargo.ts`** — grid-backed worlds whose module owns
  movement (`tracksMovement: false`): a search drone with sensor coverage, and a
  cargo drone with a weight-dependent battery. See the Drone and Cargo sections
  of [ARCHITECTURE.md](./ARCHITECTURE.md).
- **`registry.ts`** — `resolveWorldModule(kind)` maps a `WorldData.kind` to its
  module (default `maze`); `allDomainFlags()` is the union of every module's flag
  names, used for initial parsing and authoring metadata.

**Adding a new world** (e.g. traffic) = write a `WorldModule`, register it, and
add a renderer. No edits to `world.ts`, `observation.ts`, `condition.ts`, the
decision pipeline, or the simulation loop.

### The observation `domain` bag

`Observation` carries the fixed base fields plus one open bag:

```ts
interface Observation { …base fields…; domain: Record<string, number|boolean>; }
```

`observation.ts` fills it with `world.module.observe(world)`. `condition.ts`
spreads it into the evaluation context (`...obs.domain`). A new world's flags flow
end-to-end without touching the `Observation` type or the evaluator.

### Condition vocabulary

- **Initial parsing:** the loader recognizes
  `BUILTIN_FLAGS ∪ allDomainFlags() ∪ derivedConditions`, allowing one compiler
  to understand every registered module's vocabulary.
- **Active-world validation:** `buildWorld` then checks every rule, goal gate,
  and derived condition against only the base flags, the selected module's
  `domainFlags`, and that brain's derived names. A Maze run that references
  `onlineA` or a Finance run that references `robotIsPicker` fails during Apply,
  before the first tick.
- **Runtime:** the evaluator sees only the flags the active world produced this
  tick (base + `obs.domain`).

---

## Decoupling completion (Tier 3)

> Historical record. The warehouse world described here has since been removed
> from the product; the seam it proved is what every shipped module now uses.

The warehouse world was originally added *into* the engine. This refactor moved it
behind the `WorldModule` seam. Warehouse references in the engine core, before → after:

| Engine file | before | after | note |
|---|---:|---:|---|
| `decision/observation.ts` | 13 | **0** | fully generic — `domain` bag only |
| `decision/condition.ts` | 20 | **2** | comment mentions only; vocab is base + `obs.domain` |
| `world/world.ts` | 57 | **0** | no warehouse helpers; only generic grid + agent state remain |
| `types.ts` | 34 | **0** | warehouse schema moved to `worlds/warehouse.ts` |
| `runtime/loader.ts` | 35 | **0** | delegates schema validation to `WorldModule.validate` |

What moved:

- **`world.ts` → `worlds/warehouse.ts`:** the warehouse runtime types, schema
  validation, typed pick/deliver/charge actions, order/task lifecycle,
  abstract robot travel, completion, public fleet queries, and the observation bag.
  Renderers and tests import those public module queries directly.
- **`world.ts` completion logic → modules:** the maze settle-on-goal and warehouse
  all-delivered checks became `module.resolveStatus`.
- **`observation.ts` warehouse flags → `warehouse.observe`**, surfaced via
  `observation.domain`.
- **`condition.ts` hardcoded warehouse flags → `...obs.domain`.**

The registry now derives domain action and flag vocabularies from every module.
`ActionType` is open rather than a warehouse-expanded union, Studio reads domain
flag metadata from the registry, and the app dispatches Maze, Warehouse,
Supermarket, Finance, and Parking renderers through `WorldRenderer`. `buildWorld` also rejects a
function plan or condition vocabulary unavailable in the active world.

Current verification is recorded in [CHANGELOG.md](./CHANGELOG.md); module-level
tests live beside the engine under `lib/engine/__tests__/`.
