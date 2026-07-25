# Warehouse Automation

## Status

**Modes 1–4 and their Stage 1 realistic aisle layouts are delivered — 2026-07-24.**
This document is the design contract for the warehouse world.
`PROGRESS_WAREHOUSE.md` records the implementation checklist, verification, and
remaining scope.

## Why warehouse is the next world

Maze challenges ask a robot to reach a location. Warehouse automation keeps the
grid and the observable, data-driven agent, but changes the problem into useful
work: choose, collect, transport, deliver, and eventually optimise competing
priorities. The engine must still execute external intelligence rather than embed
warehouse policy.

The first slice is intentionally small. It proves that the engine can support a
different world contract and different actions without turning the warehouse into
a scripted maze or prematurely implementing every future mechanic.

## Learning journey

| Stage | Mode | New concept | Outcome |
|---|---|---|---|
| Practice | 1. First Delivery | Navigation + interaction | One package is collected and delivered to its station. |
| Practice | 2. Package Sorting | Conditional routing | ✅ 11×5 aisle loop: package type determines its destination. |
| Easy | 3. Continuous Operations | Capacity + planning | ✅ 11×5 fulfilment loop: stations expose one package at a time; collecting one immediately reveals the next until stock is exhausted. |
| Medium | 4. Energy Management | Resource planning | ✅ 11×5 night shift: every action costs power; charging must be balanced with delivery work. |
| Easy | 5. Dynamic Warehouse | Reactive decisions | Orders arrive while the robot works. |
| Advanced | 6. Multiple Robots | Coordination | Agents avoid collisions and contend for work and chargers. |
| Advanced | 7. Congestion | Adaptive routing | Mobile blockers and busy aisles make shortest paths unreliable. |
| Expert | 8. Priority Logistics | Scheduling | Package properties, deadlines, and handling constraints affect routing. |
| Expert | 9. Capacity Planning | System constraints | Delivery stations fill, requiring replanning. |
| Expert | 10. Live Warehouse | Continuous optimisation | Orders, failures, occupancy, and throughput form an open-ended simulation. |

Difficulty is deliberately not a simple mode number: Mode 5 follows Mode 3 in
Easy difficulty because it extends ongoing work; Mode 4 is layered onto that
model at Medium difficulty.

## Practice Mode 1 — First Delivery

The shipped level is a deterministic, single-robot 11×5 aisle loop. A central rack
block creates long front and back travel aisles; there is one package, one matching
delivery zone, no battery constraint, no new orders, and no other robots. The robot
must:

1. navigate to the package;
2. use `pickUp` while standing on it;
3. navigate to the delivery zone; and
4. use `deliver` while carrying the package.

The run completes only when every package is delivered. It does **not** use the
maze world's three-tick settle-on-goal rule: delivery is the terminal event in
this world.

### Delivered vertical slice

- `content/worlds/warehouse-first-delivery.json` supplies the shelves, one package, one
  delivery zone, and capacity-one cargo model.
- `content/brains/warehouse/` is an external sample brain: its rules pick up at a package,
  follow the aisles, and deliver at the matching station.
- Studio exposes **Warehouse — First Delivery** as an always-available Practice
  challenge, with the route scaffolded and the two warehouse interaction rules left
  for the learner to author. The Lab also retains the raw world/brain pair for
  engine-level experimentation.
- Both surfaces render warehouse objects and show live package, delivery, cargo,
  capacity, and delivery-count observations.
- `pickUp` and `deliver` are engine primitives; their legality is enforced by the
  world, not trusted to the brain.

## Data and engine contract

The generic grid contract is shared by the current Stage 1 worlds, while warehouse
data is owned by the `warehouse` world module through `kind: "warehouse"` and a
`warehouse` configuration. That configuration contains delivery zones, packages
(each with its required delivery zone), and carrying capacity. The module owns its
mutable runtime: waiting packages, cargo, station stock, charging stations, and
delivered packages. Source JSON remains immutable.

New primitive actions:

- `pickUp` — succeeds only while standing on a waiting package with spare capacity.
- `deliver` — succeeds only while standing on the matching delivery zone while
  carrying that package.

New observation flags:

- `packageHere`, `deliveryHere`, `carryingPackage`
- `packagesRemaining`, `deliveredCount`, `capacityRemaining`

These are facts the world exposes, not decision policy. The same safe condition
language, goals, states, rules, and reusable functions select warehouse actions.

## Boundaries of this slice

Modes 1–4 now cover typed packages, replenishing stations, cargo capacity, energy,
and charging. Not yet implemented: dynamic orders, multiple robots/collisions,
moving obstacles, deadlines, uncertainty, destination capacity, and throughput
scoring. Those mechanics must arrive as separate levels so each one introduces one
idea.

### Stage 2: non-grid warehouse space

The current layouts deliberately retain a grid because they are the low-risk Stage
1 visual and learning upgrade. The future non-grid warehouse is a separate engine
project: its world module will own named locations, travel edges/pathfinding, and
task-level observations/actions rather than inheriting tile movement from the maze
substrate. It must not be introduced as a renderer-only reskin; moving the spatial
substrate behind the world-module boundary is the acceptance criterion for Stage 2.

## Presentation

The level is available in **Studio** as **Warehouse — First Delivery**. It is an
always-available Practice challenge, separate from the linear maze curriculum: the
route is scaffolded and the learner adds Pick Up / Deliver rules through the visual
rule builder. The raw world and sample brain also remain selectable in Lab for
engine-level experimentation. The renderer identifies shelves, the waiting package,
delivery zone, and the robot's cargo; the debug panel shows warehouse observations.

The application opens with a **Maze / Warehouse** world picker. Each world then
shows only its own Studio level path; warehouse cards identify their Practice, Easy,
or Medium stage. In Studio, rules can be dragged into a new order, duplicated for
safe editing, and moved with top/up/down/bottom quick controls. The top card is
evaluated first; the rest form an ordered fallback flow. Legacy numeric rule
priorities no longer affect execution.
