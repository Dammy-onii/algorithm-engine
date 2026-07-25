# Warehouse Automation — Modes 2–4

## Status

**Delivered — 2026-07-24.** The three Studio warehouse levels below are implemented
on Stage 1 realistic 11×5 aisle layouts. The existing First Delivery level remains
Practice Mode 1 on the same floor-plan family.

## Shared rules

- Each level is an external world plus an external scaffold brain; the engine never
  embeds a route or a task-selection policy.
- Packages are typed (`red` or `blue`) and delivery zones accept a matching type.
- Invalid delivery is safe: an unmatched `deliver` action is a no-op.
- Warehouse completion means every package is delivered; it never reuses maze goal
  holding.
- Every current warehouse level uses an 11×5 perimeter aisle loop with a central
  rack block. This supersedes the earlier 5×5 / 6×6 prototype dimensions: realistic
  rack faces and long travel aisles are the deliberate Stage 1 visual upgrade.

## Practice Mode 2 — Package Sorting (11×5)

**Concept:** conditional routing.

The warehouse contains one red and one blue package, with matching red and blue
delivery zones. The learner must use carried-package and delivery-zone observations
to decide when it is safe to unload. The scaffold supplies a deterministic aisle
route and package pickup; the learner adds sorting rules such as:

```
WHEN deliveryRedHere && carryingRed  → Deliver
WHEN deliveryBlueHere && carryingBlue → Deliver
```

The key lesson is that reaching a delivery location is insufficient: the robot must
interpret both its cargo and the location's type.

## Easy Mode 3 — Continuous Operations (11×5)

**Concept:** capacity and planning.

Two package stations sit on a fixed, shelf-bounded route. Each station exposes only
one package at a time. When a package is collected, the next one appears immediately
until its station's configured stock is exhausted. The baseline level uses:

| Station | Visible package | Total stock | Destination |
|---|---:|---:|---|
| Red station | 1 | 3 | Red outbound |
| Blue station | 1 | 3 | Blue outbound |

The robot carries at most two packages. The student must use `capacityRemaining` to
avoid attempting a third pickup and deliver cargo before continuing work. This is the
first warehouse level where finishing one visible package does not finish the task.

## Medium Mode 4 — Energy Management (11×5)

**Concept:** resource management.

Mode 4 uses the same blocked 11×5 operations floor and station model as Mode 3,
plus a 60-unit battery and charging bay at the staging corner. Every action costs
one energy. `charge` is valid only while standing on a charging station; it restores
the robot to the world's configured energy capacity (the charging action itself
still consumes its normal tick).

The learner adds a high-priority rule such as:

```
WHEN chargingHere && energy < 40 → Charge
```

The intended trade-off is explicit: charging too early costs throughput, but failing
to charge makes the robot stop before delivering the remaining work.

## Studio and interaction design

The root page is a world selector: **Maze** or **Warehouse**. Each world then shows
only its own Studio levels. Warehouse stages are grouped by Practice, Easy, and
Medium difficulty. Lab remains a raw engine harness under the Maze experience; it
is not the learning route for warehouse levels.

Rules are displayed and evaluated in authored top-to-bottom order. Studio lets a
rule be duplicated before editing and moved with drag-and-drop or
top/up/down/bottom quick controls. The first matching safe rule runs; folders and
legacy numeric priorities do not affect that order.

## Out of scope

Dynamic orders (Mode 5), multi-robot coordination, congestion, deadlines,
uncertainty, station capacity, and throughput scoring remain future levels. Mode 3
implements deterministic replenishment only; it does not create new orders after a
station's configured stock is exhausted.

## Verification

The Stage 1 layout refresh is verified by outcome-based integration tests rather
than fixed robot coordinates. This is important: the test contract is “the worker
can see typed cargo, replenishment occurs, and the run completes”, not an accidental
claim about a particular tile after a fixed number of ticks. Current command results
are recorded in `PROGRESS_WAREHOUSE.md`.
