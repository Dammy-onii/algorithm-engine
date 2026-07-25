# Warehouse Automation — Delivery Tracker

Status legend: ⬜ not started · 🟨 in progress · ✅ done

_Modes 1–4 and the Stage 1 realistic aisle-layout refresh were completed
2026-07-24._

## Pre-implementation decisions

- [x] Define the full warehouse learning journey and scope the first shippable level.
- [x] Preserve the engine boundary: warehouse policy stays in an external brain.
- [x] Keep Mode 1 intentionally deterministic: one robot, one package, one delivery
  zone; no energy, orders, collisions, or replenishment yet.
- [x] Keep Stage 1 on a grid while making its layouts look and behave like warehouse
  aisles; reserve a non-grid location/task model for Stage 2.
- [x] Define distinct terminal semantics: all deliveries complete the warehouse;
  maze-only goal holding does not apply.

## Implementation

- [x] Extend world and observation contracts for the warehouse.
- [x] Add `pickUp` and `deliver` as validated primitive actions.
- [x] Implement warehouse runtime state and completion semantics.
- [x] Add the Mode 1 world JSON and sample warehouse brain.
- [x] Register the world and brain in the Lab.
- [x] Add the same level to Studio as an always-available Practice challenge, with
  visual Pick Up / Deliver blocks and warehouse condition chips.
- [x] Implement typed packages and typed delivery-zone observations for Mode 2.
- [x] Implement replenishing package stations and capacity-two operations for Mode 3.
- [x] Implement charging stations and the `charge` primitive for Mode 4.
- [x] Add a root world picker and separate Maze/Warehouse Studio level views.
- [x] Add draggable Studio rules with priority renumbering from 1.
- [x] Render warehouse objects and expose warehouse observations in debugging UI.
- [x] Add unit/integration coverage for pickup, delivery, invalid interactions, and
  data-driven completion.
- [x] Replace prototype grids with verified 11×5 aisle loops and central rack blocks
  across Modes 1–4.
- [x] Make warehouse integration tests outcome-based, so layout changes do not rely
  on stale fixed tick/position assumptions.

## Verification and handoff

- [x] Run tests, lint, TypeScript, and a production build attempt.
- [x] Update this tracker with results and remaining scope.
- [x] Update the roadmap/milestone documentation to reflect the warehouse vertical slice.

## Verification

- `npm test` — ✅ 62 tests after the layout refresh, including typed sorting,
  replenishment, capacity accounting, charging, and Studio-authored completion.
- `npm run lint` and `npx tsc --noEmit` — ✅ clean after the refresh.
- `npm run build` — ✅ production compile, TypeScript, and static generation pass.
  The configured Geist fonts require external access during a cold build; the build
  was rerun with that access and completed successfully.
- Local browser automation remains unrun: the sandbox cannot bind the dev server and
  no browser dependency was added solely for verification.

## Delivered behaviour

- The warehouse source is validated: capacity is positive, package and delivery ids
  are unique, packages reference real zones, and every location is walkable.
- `pickUp` is a no-op away from a package or at full capacity; `deliver` is a no-op
  away from the matching destination. These invalid actions cannot fabricate work.
- A warehouse reaches `reached` only after its final package is delivered. Maze goal
  holding remains unchanged and is explicitly disabled for warehouse completion.

## Remaining scope

The next Stage 1 levels remain intentionally unimplemented: dynamic orders,
multiple robots, congestion, deadlines, uncertainty, destination capacity, and
throughput scoring. Stage 2 is a different architectural change: move the spatial
substrate behind the world-module boundary so a warehouse can use named locations,
travel edges, and task-level actions instead of a grid. See
`WAREHOUSE_AUTOMATION.md` and `WAREHOUSE_MODES_2_4.md` for the level contracts.
