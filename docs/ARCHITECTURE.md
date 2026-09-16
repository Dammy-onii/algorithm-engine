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

content/challenges/*/*.json ─┐
content/worlds/*.json      ├─► content + dataset registries ─► Simulation
content/brains/*/*.json    ┘                                  │
                                                        observe → decide
                                                              → act → snapshot
                                                                    │
                                       route-owned page UI / Studio / Lab / renderer
```

There are four distinct concerns. They should not be conflated:

| Concern | Owns | Main locations |
|---|---|---|
| **Authored content** | Grid layouts, sample brains, challenge text/scaffolds | `content/` |
| **Engine** | The tick lifecycle, safe rule evaluation, base grid movement | `lib/engine/` |
| **World module** | Behaviour unique to one domain: shelf restocking, payment routing, or maze completion | `lib/engine/worlds/` |
| **Routes** | URL validation and route parameters | `app/` |
| **Feature UI** | Persistence, editor interactions, rendering and workspaces | `features/`, `shared/` |

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

Studio persists an explicit **Visual Policy / Code Controller** selection.
Opening a tab never changes ownership. The Code editor compiles the returned
controller object locally when Code Controller is selected and the user presses
Apply & Run. Base observation fields are direct properties;
world-module facts are under `observation.domain`. The UI derives its valid
return-action list from the selected challenge's single-action function
wrappers. This local compiler is not used by interview Submit.

For bundled interview submissions, the safe visual policy DSL can also be sent
to `POST /api/interview/submit`. That route resolves server-owned hidden Finance
or Parking fixtures and streams case progress, scores, diagnostics, and each
guardrail's actual value and limit—not hidden inputs.
Arbitrary Code-mode JavaScript remains local until deployment supplies an
isolated untrusted-code worker.

The detailed controller lifecycle, current browser compiler, Rules/Code
interaction, language-neutral process protocol, and hidden-test placement are
documented in [CODE_MODE.md](./CODE_MODE.md).

World directory pages and single-challenge Share actions both create a short
`/i/[assignmentId]` link. The assignment ID is a signed stateless token of
registry references—not a copied challenge, fixture set, or file-backed
assignment. Normalization always inserts the world's marked interview tutorial,
then sorts by ascending difficulty, taxonomy grade, and challenge number. Each
problem still submits independently to its own `interviewEvaluation.suiteId`.
The current token revocation generation is version 4; versions 1–3 are
rejected. Predictable `/interview/[challengeId]` links are retired because they
cannot be individually or globally revoked.

---

## 2. Data contracts and mutability

The engine accepts exactly two immutable input contracts.

### `WorldData`

`WorldData` describes the environment: dimensions, tiles, start/goal, optional
energy, and a `kind`. A world module can own an additional static configuration:
Warehouse adds packages, zones, stations, and chargers; Finance adds providers
and transactions; Parking adds spaces and scheduled vehicles.

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

World modules may implement `advanceTick(world)` for autonomous domain activity
after the shared clock advances. Finance uses it for in-flight provider work,
capacity, retries, deadlines, and queue pressure. Real-time Parking uses it for
entry/exit completion, gate/lane schedules, closures, cancellations, patience,
rerouting, and congestion. This keeps autonomous domain behavior behind the
existing module boundary.

The shared debug panel receives the selected module's `domainFlags` metadata.
Its decision pipeline remains immediately visible, while base observation,
domain facts, and memory use collapsible sections; the complete panel can also
be collapsed. Computed numeric facts render to two decimal places, explicit
percentage metrics include `%`, and raw domain ids are replaced by module
labels.

---

## 3. Loading a runnable simulation

```text
ChallengeData.worldKey
       │
       ▼
lib/content/datasets.ts ──► WorldSource { world, entities }
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
grids, out-of-bounds start/goal tiles, bad warehouse robot/shelf/order data,
unknown functions, duplicate function IDs, recursive function plans, invalid
conditions, bad state references, and circular derived conditions before a run
starts. This makes authoring errors appear on **Apply & Run**, not half-way through
a tick loop.

`lib/content/datasets.ts` is the bundled demonstration registry. It maps stable keys
such as `warehouse-first-orders` to imported JSON and shared entity data.
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

- Expands arriving orders into one claimable pick task per requested item-unit.
- Maintains one or more typed robots behind a round-robin current-robot
  dispatcher. The shipped *First Orders* level instantiates only one `picker`;
  `forklift` and `coldchain` remain module capabilities for later content.
- Implements typed `pickSmall`, `pickLarge`, and `pickFrozen` assignments plus
  `deliver` and optional `charge`.
- Advances every robot's abstract shelf/packing travel while the generic engine
  still requests only one policy decision per tick.
- Enforces robot type, idle state, and cargo capacity through action
  preconditions; resolves order completion and deadlines in module state.
- Produces robot, task, order, typed-pick, packing, deadline, and score facts in
  `Observation.domain`.

Those flags are returned in `Observation.domain`. The common evaluator spreads that
bag into its context, so a warehouse rule can write
`robotIsPicker && smallTaskAvailable` without the evaluator gaining
warehouse-specific code.

### Supermarket, Finance, and Parking modules

These modules set `tracksMovement: false` and use the common tick lifecycle.
For Supermarket this means the domain owns its route progress rather than the
generic maze visited-cell heuristic; it still displays and pathfinds over its
authored floor grid:

- `supermarket.ts` owns the shared floor/fixture contract, breadth-first routes,
  phased stockroom → shelf → standby travel, shelf stock, scheduled demand,
  backroom inventory, lost sales, category-specific dispatch, and completion
  after the demand period ends with healthy shelves. Layout presentation is an
  authored choice: the geometry-first tutorial and illustrated Closing Rush
  both retain the same collision/path contract. The Kenney Mini Market test
  stage exercises a third presentation variant without adding engine branches.
- `finance.ts` owns payment queues, provider health, routing outcomes, costs,
  failures, and completion after the queue settles.
- `parking.ts` owns scheduled arrivals, typed parking capacity, assignments,
  exit requests, user-authorized departures, allocation violations, entry/exit
  waiting time, utilization, and completion after every vehicle has left.

Their renderers consume public module queries. Neither the generic `World` nor
the decision pipeline contains Supermarket-, Finance-, or Parking-specific
branches.

### Drone module

`lib/engine/worlds/drone.ts` is the one operational world that is still spatial:
it keeps `tracksMovement: false` (the drone legitimately re-crosses covered
ground to home in or refuel, so the generic idle-tile heuristic would fire on
correct behaviour) while flying over an authored grid.

- Owns the drone's onboard bookkeeping: the set of cells the sensor has covered,
  sticky target detection, the recharge pad, and `scanRadius` as runtime state
  so a later level can trade battery for a wider sweep.
- Replaces turn-and-step with four cardinal actions (`moveNorth`, `moveEast`,
  `moveSouth`, `moveWest`), plus `report` and `recharge`. Preconditions guard
  each: movement on `!blockedX`, `report` on `atTarget`, `recharge` on `onPad`.
- Adds two **composite** actions, `flyToTarget` and `flyToSearch`, which resolve
  a bearing to one cardinal step inside the module — the same shape as Parking's
  `parkStandard` resolving "nearest free standard space". They exist so a policy
  can express the search/track switch without four near-identical rules per
  direction; a test asserts the composite and hand-written cardinal policies fly
  identical routes. Guarded by `targetDetected && !atTarget` and `searchPending`.
  Withholding them from a later challenge's `availableBricks` is the difficulty
  dial: the user then has to author the four-way dispatch themselves.
- Sensing is passive and runs in `advanceTick`, so hovering and recharging scan
  exactly as moving does.
- Because the condition grammar has no strings, every bearing is four booleans.
  `searchNorth`/`searchEast`/… is a breadth-first first step toward the nearest
  uncovered cell, so it stays correct once a level adds no-fly zones to route
  around. Target bearings and `targetDistance` stay blank until detection, so an
  undetected target leaks nothing through the observation.
- Completion is `reported`; running the battery flat ends the run through the
  generic energy rule.

This module is the clearest illustration of the division of labour the engine
assumes: the *bookkeeping* is drone hardware and belongs in the module, exactly
as the base grid tracks `visited` for the maze, while the *strategy* — how to
sweep, when to break off and close in — stays with the user in either authoring
surface.

### Cargo module

`lib/engine/worlds/cargo.ts` is the drone as a logistics agent, and the hard
counterpart to the search world. Nothing is hidden: the manifest — every crate's
cell, weight, and value — is given up front. The problem is combinatorial, not
perceptual.

- Owns pickup/carry/deliver bookkeeping, the carry-weight cap, and a battery
  model where each move costs `1 + ceil(load × drainPerWeight)` — so carrying
  weight is what drains the battery, and carrying the wrong things far is what
  fails a run. Completion is a *safe homecoming*: back on the depot, empty, with
  the delivered-value target met.
- Actions: the four cardinal moves, `pickUp`/`dropOff`, and the composites
  `flyToNearestObject` / `flyToDepot`. A greedy visual policy (fly to nearest
  fitting crate, bank it, repeat) clears the required objective; the bonuses
  reward value-for-weight selection and routing, which is where the Code
  Controller earns its keep.
- The manifest is exposed two ways because the condition grammar has no arrays:
  aggregate facts (`weightHere`, `capacityLeft`, `deliveredValue`, `drainPerMove`)
  for the visual palette, and the full flattened manifest (`obj0Weight`,
  `obj0Col`, `obj0Active`, … up to `CARGO_OBJECT_SLOTS`) on `observation.domain`
  for a Code Controller to run a real knapsack over.

The level is calibrated so a straightforward strategy passes and an optimal one
is measurably better — the shipped greedy scaffold delivers 33 value in 74 ticks
with 17 battery left (required met, every bonus missed), while a value-aware
routing planner delivers 36 in 63 ticks with 51 battery (every bonus met). Both
outcomes are locked by tests.

### Registry of shipped modules

`lib/engine/worlds/registry.ts` maps known `WorldData.kind` values to modules:

```text
"maze"      → mazeModule
"warehouse" → warehouseModule
"supermarket" → supermarketModule
"finance"   → financeModule
"parking"   → parkingModule
"drone"     → droneModule
"cargo"     → cargoModule
missing kind → mazeModule
```

Only shipped modules can be resolved. Content may select a known module ID, but it
cannot inject executable behaviour. `allDomainFlags()` supplies the global known
vocabulary for initial parsing. When a `World` is assembled, conditions, derived
conditions, and goal gates are checked again against only the active module's
facts, so a Finance fact cannot enter a Maze run.

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

Studio resolves Code reference facts and playback behaviour from the challenge's
actual `worldKey → WorldData.kind`, not from the catalogue pack ID. A future pack
can therefore reuse an existing world module without presenting the wrong
actions or facts.

Each module declares typed `domainFlags`, and the registry derives both the known
condition vocabulary and editor metadata from every registered module. Studio's
condition controls therefore do not maintain a warehouse-specific flag list.

The application dispatches boards and legends through
`features/simulation/components/renderers/WorldRenderer.tsx`: `MazeRenderer` is maze-only and
`WarehouseRenderer` owns the interactive order-flow board, compact sprite-backed
factory floor, robot travel, shelf/packing inspection, and order workboard;
`SupermarketRenderer` renders the module's exact plan grid, blocked fixture
footprints, remaining route, live shelf health, backroom inventory, scheduled
demand, and cell-by-cell restocking-bot motion;
`FinanceRenderer` owns the transfer flow; and `ParkingRenderer` owns the
operational lot. The debug panel is generic and shows whatever facts the active
module observed.

Adding a new world still requires its reviewed module and renderer to be registered
with the application. That is the intended security boundary; authored content
cannot supply executable code.

---

## 6. Content, pack, challenge, and curriculum registries

Several registries exist because they answer different questions.

| Registry | Question it answers | Source |
|---|---|---|
| World-module registry | “Which executable domain behaviour is allowed?” | `lib/engine/worlds/registry.ts` |
| Dataset registry | “Which bundled world/brain source has this key?” | `lib/content/datasets.ts` |
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

Each JSON descriptor in `content/challenges/<pack>/` is self-contained
presentation and authoring metadata. The folder provides human organization while
the descriptor's `pack` remains the runtime source of truth. Its `worldKey`
resolves its environment, `scaffoldBrain` starts Studio, and its available
bricks/conditions and unlock flags shape the editor. Objectives are evaluated
after a run; only non-bonus objectives gate completion.

Every bundled descriptor authors a structured brief, context, live steps, staged
hints, and full taxonomy. Content tests check those fields, ensure exposed
conditions belong to the selected world module, require every exposed brick to
have an implementation and description, keep stage/taxonomy difficulty aligned,
and reject learner copy that describes the retired numeric-priority execution
model. Optimization claims belong in required objectives; bonus objectives may
only describe optional quality improvements.

Authored `steps` are learning guidance displayed in the problem brief. The live
Task Progress checklist is derived from the same non-bonus objectives used by
Results, so a completed visible policy cannot show a contradictory failed task.
The collapsible Policy Constraints panel exposes the exact expressions and
world-specific violations. Both autoplay and manual Step use the same terminal
grading and persistence path.

`features/studio/pages/StudioPage.tsx` persists a user's visual brain through
`features/studio/persistence.ts` under `ae-brain-<challenge-id>` and completion
under `ae-complete-<challenge-id>` in `localStorage`. Persistence stays keyed by
challenge ID, so routing does not change saved work.

Studio owns a full-width problem workspace rather than using catalogue page
chrome. Its toolbar provides challenge-directory, previous/next, run, Lab, and
theme actions. The authoring and simulation panes scroll independently on wide
screens: the desktop page is fixed to the viewport and each pane body owns its
visible scrollbar. Narrow screens stack the panes and use normal document
scrolling. A local Problem list drawer searches the current pack and displays the
same curriculum unlock state used by direct challenge navigation. Its header
shows one pack-scoped `solved / total` fraction and the world name; the former
duplicate “Level X of Y · N done” block and dotted progress track are not
rendered. Drawer difficulty uses the catalogue policy, including a green
Tutorial label for guided difficulty-1 challenges. Selecting an item still
changes the URL through the router.

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
  worlds/                immutable scenario data for every shipped world
  brains/
    default/             sample maze follower
    naive/               deliberately limited sample
    dash/                multi-step-brick sample
    warehouse/           sample warehouse worker
    finance/             sample payment router
    parking/             sample smart-facility operator
    drone/               sample surveillance drone
    cargo/               sample greedy cargo drone
  challenges/
    maze/                Maze descriptors
    warehouse/           Warehouse descriptors
    finance/             Finance descriptors
    parking/             Parking descriptors
    drone/               Drone Surveillance + cargo descriptors
    index.ts             ordered bundled registry
lib/
  engine/                framework-independent runtime and world modules
  content/               pack/challenge catalog API
  authoring/             Studio compiler, decompiler and objective evaluator
  curriculum/            progression graph
app/
  page.tsx               home route
  [pack]/…               thin validated route segments
  lab/                    raw JSON harness route
features/
  application/           shared PageLayout
  catalogue/             Home/directory page UI and difficulty policy
  studio/                Studio page state, persistence and authoring UI
  lab/                   Lab page state and raw JSON editor
  simulation/            shared stage, controls, debug panel and renderers
shared/
  components/            cross-feature UI
assets/
  parking/               imported parking artwork
```

The imports are still bundled at build time. This layout is the Phase A base for
the future content-loader design: replacing bundled imports with local or remote
fetching should not change the engine, Studio, or route contracts.

The UI dependency direction is also deliberate: each route file renders its own
feature page component. Catalogue and Lab pages share the stateless
`features/application/components/PageLayout.tsx`; Studio owns its denser problem
workspace chrome. Studio and Lab reuse simulation presentation, but no page
shares route state. The generic engine remains below all React code.

---

## 8. Route ownership

The App Router owns what screen is displayed:

```text
/                       world picker
/maze                   validated Maze challenge-row directory
/warehouse              validated Warehouse challenge-row directory
/finance                validated Finance challenge-row directory
/parking                validated Parking challenge-row directory
/drone                  validated Drone Surveillance challenge-row directory
                        (mixed world kinds: search + cargo)
/[pack]/[challenge]     one validated, shareable Studio challenge
/i/[assignmentId]       signed interview directory
/i/[assignmentId]/[challengeId] selected signed interview problem
/interview/[challengeId] revoked legacy route; always 404
/lab                    raw JSON engine harness
```

Thin server route pages validate the `pack` with `findPack` and the challenge
with strict `getChallenge`; a challenge must also belong to the requested pack.
The signed interview routes verify the assignment token and selected challenge
membership, then reference registry challenges rather than copying them into an
assignment record. Invalid
paths call `notFound()`.

Home and challenge-directory page UI are server-renderable and navigate with
links. `StudioPage` and `LabPageView` are separate client boundaries: each owns
only its own timers, editor state, and simulation session. Navigating between
routes therefore unmounts the relevant page lifecycle naturally. Challenge
navigation remains URL-driven, so browser history and copied URLs are meaningful.

For the detailed routing implementation and verification notes, see
[ROUTING_AND_STRUCTURE.md](./ROUTING_AND_STRUCTURE.md).

---

## 9. Safe extension recipes

### Add a level to an existing world

1. Add a `WorldData` JSON file under `content/worlds/`.
2. Add it to `lib/content/datasets.ts` with a stable `worldKey`.
3. Add a challenge descriptor in `content/challenges/<pack>/` and import it from
   `content/challenges/index.ts`.
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
