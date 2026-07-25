# Parking Simulation — Smart Facility Operations

**Implementation status:** shipped locally on 2026-07-25 with three playable
levels, a registered `parking` world module, a reference operator brain, a
responsive facility renderer, curriculum progression, and headless tests.

Parking is a real-time resource-allocation simulation. The participant does not
drive a car through a maze; they author the decision system that assigns arriving
vehicles to suitable spaces while spaces are continuously occupied and released.

## Fixed engine loop

```text
Observe arrivals and lot capacity
        ↓
Run user-authored intelligence
        ↓
Choose one parking action
        ↓
Engine validates space availability
        ↓
Assign, wait, release departing vehicles, update metrics
        ↓
Render the operational lot
```

Parking is a `WorldModule`. The generic engine continues to own ticks, action
application, traces, objectives, rule execution, and Code mode.

## Runtime model

### Spaces

Each space has:

- stable `id`;
- `kind`: standard, charging, large, premium, accessible, or reserved;
- visual row and position in the lot;
- optional reservation owner;
- distance to the exit;
- current occupant, derived from parked vehicles.

### Vehicles

Each scheduled vehicle has:

- arrival tick and expected parking duration;
- compact or large size;
- optional electric, VIP, accessible-permit, or reservation attributes;
- runtime state: scheduled/waiting, parked, departed;
- assigned space, waiting time, parking and departure ticks.

Vehicles arrive over time. A successful parking action assigns the head of the
waiting queue. When a parked vehicle's configured stay expires, it raises an
exit request but continues occupying its bay. The user's ordered rules must
authorize the head exit request; only then does the vehicle leave and release
the space for a later arrival.

This makes departure a second resource decision rather than an automatic timer:

```text
Arrival queue ── allocation rule ──▶ occupied bay
                                         │ stay expires
                                         ▼
Exit request  ── release rule ─────▶ checkpoint ──▶ departed + bay freed
```

## Actions

The module exposes explicit allocation policies rather than steering commands:

| Action | Meaning |
|---|---|
| `parkStandard` | Assign the head vehicle to the first free standard space. |
| `parkCharging` | Assign it to a charging bay. |
| `parkLarge` | Assign it to a large-vehicle bay. |
| `parkPremium` | Assign it to a premium/VIP bay. |
| `parkAccessible` | Assign it to an accessible bay. |
| `parkReserved` | Assign it to its matching reserved bay. |
| `releaseVehicle` | Authorize the oldest ready vehicle through the exit checkpoint and free its bay. |
| `wait` | Leave the queue unchanged for one tick. |

The engine only blocks an action when its target space category has no capacity.
It does not silently correct a poor policy: putting an ordinary car in a protected
space or failing to give a special vehicle the correct resource records a
violation.

## Observation vocabulary

The rules and Code-mode controller receive facts, not a precomputed answer:

- queue: `hasWaitingVehicle`, `queueLength`, `allVehiclesArrived`;
- exit: `hasExitRequest`, `exitQueueLength`, plus the head exiting vehicle's
  electric, large, VIP, accessible, and reserved facts;
- head vehicle: `carElectric`, `carLarge`, `carVIP`,
  `carAccessible`, `carReserved`;
- capacity: `standardAvailable`, `chargingAvailable`, `largeAvailable`,
  `premiumAvailable`, `accessibleAvailable`, `reservedAvailable`,
  `spacesAvailable`, `occupiedSpaces`;
- outcomes: `parkedCount`, `departedCount`, `violations`, `averageWait`,
  `utilization`, `allVehiclesServed`.

The author decides which facts matter and which space category to select.

## The first three levels

### Level 1 — First Shift

- One entrance, one exit, eight standard spaces.
- Compact vehicles arrive at different ticks and later leave.
- Learner task: park every waiting vehicle in standard capacity.
- Teaches continuous queue processing and resource reuse.

### Level 2 — Match the Vehicle

- Standard, charging, and large-vehicle spaces.
- Compact, electric, and large vehicles share the queue.
- Learner task: put specific rules above the standard fallback.
- Teaches typed resource allocation without answer-revealing conditions.

### Level 3 — Priority Access

- Adds premium, accessible, and individually reserved spaces.
- VIP, accessible-permit, reserved, EV, large, and ordinary vehicles overlap.
- Learner task: protect constrained capacity while maintaining throughput.
- Teaches policy ordering and competing operational constraints.

## Renderer and sprite-pack map

The supplied parking asset directory contains:

- `spritesheet/CP_V1.0.4.png` — 1024×1024 city atlas. Useful regions include
  top-down cars and trucks, a parking kiosk/gate, barriers, traffic signals,
  signs, lamps, and road furniture.
- `Animations/BL001.png` — building-light animation strip.
- `Animations/BD001.png` — building-door animation strip.
- `Animations/SL001.png` — streetlight/traffic-signal animation strip.

The first implementation uses vehicle sprites from the main atlas over a
responsive CSS-painted parking lot. Painted bays, a central drive aisle, entrance,
exit, queue lane, and zone labels scale cleanly without exposing engine grid
cells. Queued cars appear at the entrance; assigned cars occupy bays; cars
disappear from bays and briefly appear at the exit when their stay ends.

The board also shows the head vehicle entering the allocation controller, live
parked/departed/violation counters, the most recent space assignment, and the
category painted into each bay. Its responsive breakpoint is based on the
renderer container rather than the browser viewport, so it adapts to Studio's
resizable simulation column.

## Metrics

The first three levels grade:

- every vehicle served and eventually departed;
- allocation violations;
- average queue wait;
- space utilization;
- special-vehicle misallocation.

Congestion, multiple entrances, maintenance closures, demand surges, charging
failures, and reservation forecasting remain later parking levels.

## Animation policy

Movement animation is advisable here as operational feedback, provided it never
becomes simulation state. The engine remains deterministic and tick-based; the
renderer only animates transitions that already happened:

- new arrivals enter the queue from the entry side;
- an assigned vehicle moves from the central aisle into its bay;
- a ready-to-leave vehicle is visibly marked while it still occupies capacity;
- an authorized departure moves through the exit checkpoint and off the lot.

Animations use transform/opacity, are short enough to keep the decision trace
readable, and are disabled by the user's reduced-motion preference. They never
delay a tick or decide when capacity is released.

### Real-time route interpolation

Parking motion is synchronized to the simulation transport:

- at `1/s`, a route animation occupies roughly 80% of the one-second tick;
- at `2/s` and `3/s`, its duration scales down so it finishes before the next
  deterministic tick;
- manual Step still plays one complete transition;
- stopping the engine prevents new transitions, while the transition already
  committed by the previous tick is allowed to finish.

An assignment follows three visible waypoints: entrance gate → central aisle →
the selected bay. An authorized departure reverses that route: occupied bay →
central aisle → exit checkpoint → beyond the lot edge. The target waypoint is
derived from the assigned space's authored row and order, so cars move to their
actual rendered slot rather than playing a generic overlay animation.

At the final assignment waypoint, ownership of the visual switches once: the
moving route sprite becomes invisible before the stationary bay occupant is
revealed. The two sprites never share a visible frame, preventing the apparent
car duplication that a retained CSS animation endpoint would otherwise cause.

## Files and extension points

- Domain runtime and policy actions:
  `lib/engine/worlds/parking.ts`
- Module registration:
  `lib/engine/worlds/registry.ts`
- Operational renderer:
  `features/simulation/components/renderers/ParkingRenderer.tsx`
- Three immutable scenarios:
  `content/worlds/parking-*.json`
- Three challenge briefs:
  `content/challenges/parking/17-parking-*.json` through
  `content/challenges/parking/19-parking-*.json`
- Solving reference policy:
  `content/brains/parking/`
- Runtime and authored-level verification:
  `lib/engine/__tests__/parking.test.ts`

The engine still uses the common `WorldData` envelope, so parking JSON retains
the shared one-cell placeholder required by that envelope. `tracksMovement:
false` ensures movement heuristics do not apply, and the renderer never displays
that placeholder as a grid.

## Verification

- TypeScript accepts the module, content imports, and renderer, and the
  production Next.js build succeeds.
- Runtime tests prove that a completed stay does not release capacity until
  `releaseVehicle` authorizes it, then the finite space can be reused.
- A deliberately wrong standard assignment for an EV records a violation.
- The reference ordered policy completes all three authored levels and satisfies
  every required objective.
- Persisted brains are upgraded forward: newly shipped primitive wrappers such
  as `release-vehicle` are merged, and only a redundant terminal
  `always → hold` is removed so it cannot hide newly appended rules.
- The full suite passes: 16 test files and 93 tests. This includes assertions
  that route duration stays below the selected tick interval and that bay
  waypoints come from the actual row/order data. The Parking challenge route
  returns successfully; the operational renderer was inspected at desktop and
  narrow widths, and a route was visually frozen mid-aisle to verify its
  geometry.
