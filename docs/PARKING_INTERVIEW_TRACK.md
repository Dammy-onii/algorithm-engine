# Parking Interview Track

## Product framing

The candidate is not asked to “solve parking.” They are asked to author the
control policy for an automated parking facility. Parking supplies a concrete,
visual environment for evaluating scheduling, state consistency, back-pressure,
fairness, failure recovery, and algorithmic generalization.

Each stage is shareable through a signed `/i/[assignmentId]`; no separate
assignment content is created.

Every Parking interview stage begins with an empty rule set. Available primitive
functions remain visible, but the candidate authors the complete control flow.

The track contains three problems:

| Problem | Catalogue difficulty | Evaluation size | Primary assessment |
|---|---:|---:|---|
| Smart Parking Controller | Higher Medium tutorial | 1 visible + 6 hidden | safe category allocation and two-queue coordination |
| Autonomous Parking Operations | Higher Medium | 1 visible + 8 hidden | live capacity incidents, congestion, and fairness |
| Production Parking Orchestrator | Hard | 1 visible + 10 hidden | long-running stability under overlapping adversarial events |

The challenge numbers are 23–25. They follow the three foundational Parking
lessons without replacing them.

## Actual control boundary

The candidate controls:

- which category should receive the head entrance vehicle;
- whether to wait and allow current physical work to advance;
- when to authorize the oldest ready departure;
- the top-to-bottom ordering and conditions of those decisions.

The facility allocator controls exact bay selection inside the chosen category.
It chooses the nearest currently open, unoccupied compatible bay. This boundary
is deliberate: the present visual authoring action model uses fixed action ids,
not parameterized `park(zone, bay)` calls. Zones are therefore environment
metadata and layout variation, not individually addressable controller targets.
The briefs state this explicitly rather than claiming arbitrary zone routing.

One decision is accepted per tick. Cars already entering, parked, or exiting
continue progressing in parallel between decisions.

## Real-time state machine

```text
scheduled
   │ arrival time
   ▼
waiting ── allocation ──▶ entering ── travel completes ──▶ parked
   │ patience expires                                      │ stay expires
   ▼                                                       ▼
abandoned                                                ready
                                                           │ release + gate/lane slot
                                                           ▼
                                                        exiting
                                                           │ travel completes
                                                           ▼
                                                        departed
```

`waiting` is represented by a scheduled vehicle whose arrival tick has passed.
A cancellation event can move a scheduled/waiting vehicle to `cancelled`.
`departed`, `abandoned`, and `cancelled` are terminal states.

Assignments reserve a bay immediately but do not mark the vehicle parked until
entry travel finishes. Departures continue occupying their bay while exiting;
capacity is released only when exit travel finishes. This prevents the former
instant-allocation model from reporting capacity that does not physically exist.

If a reserved inbound bay closes before the car arrives, the engine cancels that
assignment, returns the car to the entrance queue, and records a reassignment.
The candidate then makes a fresh decision from current observations.

## Queue policy and fairness

The entrance queue is not blindly FIFO. It selects:

1. vehicles within ten ticks of exhausting patience;
2. higher business priority;
3. lower remaining patience;
4. earlier arrival;
5. stable vehicle id.

The deadline override prevents a permanent stream of high-priority vehicles from
starving ordinary traffic. The controller still decides whether the selected
vehicle is allocated or held.

The exit queue orders by ready time and parked time. A ready car still consumes
a bay, so exit processing is also capacity recovery.

## Hard and soft constraints

Hard violations represent unsafe or forbidden allocations:

- an occupied or closed bay;
- a mismatched reservation;
- an accessible allocation without a permit, or a permit holder placed outside
  accessible capacity;
- a large vehicle outside a large bay.

Preference violations are valid but lower-quality service:

- an electric vehicle outside charging capacity;
- a VIP vehicle outside premium capacity;
- another non-hard mismatch from the preferred category.

The engine does not silently repair a candidate policy. Action preconditions
skip unavailable categories, but a valid fallback may still carry a preference
penalty. Hard-special vehicles need explicit guarded wait/recovery branches so a
generic standard fallback cannot bypass their constraint.

## Dynamic facility mechanics

The interview worlds enable `operationsMode: "realtime"` and configure:

- entry and exit travel durations;
- shared movement-lane capacity;
- exit-gate concurrency;
- congestion delay per active movement;
- per-space close/reopen schedules;
- facility lane/gate capacity schedules;
- vehicle priority, patience, arrival time, stay duration, and cancellation;
- deterministic traffic batches for large visible and hidden streams.

At each tick, the world applies the candidate's one action, advances the clock,
then completes movements, applies capacity events, raises exit requests, expires
patience, processes cancellations, and updates queue/congestion metrics.

## Observation contract

The new interview facts supplement the original Parking vocabulary:

- urgency: `carPriority`, `carWait`, `carPatienceRemaining`;
- exit pressure: `exitWait`, `exitQueueLength`, `exitGateAvailable`;
- movement: `laneAvailable`, `laneLoad`, `laneCapacity`, `movingVehicles`,
  `congestion`;
- outcomes: `hardViolations`, `preferenceViolations`, `abandonedCount`,
  `cancelledCount`, `reassignmentCount`, `congestionTicks`,
  `maxEntranceQueue`, `maxExitQueue`, `parkingScore`;
- completion: `allVehiclesResolved` and the stricter `allVehiclesServed`.

Existing category and vehicle facts remain available. Conditions expose raw
state, not a precomputed “best bay.”

## Apply & Run versus Submit solution

These are separate execution paths:

### Apply & Run

- compiles the current visual policy;
- runs only the challenge's visible world in the browser;
- shows all visible incidents, queues, movements, metrics, and trace;
- never imports, requests, or executes a hidden Parking fixture.

### Submit solution

- follows the active **Visual Policy / Code Controller** selector;
- sends a Visual Policy to `POST /api/interview/submit`, where the server
  resolves and evaluates its protected Parking suite;
- in Code Controller Demo mode, requests the suite from
  `POST /api/interview/demo-suite` only after the click, then runs the
  candidate JavaScript and simulations in the browser (a Web Worker in the
  production build);
- reports events in this order:

```text
suite-start
scenario-start
scenario-result
scenario-start
scenario-result
...
suite-complete
```

Studio renders each completed case as it arrives. Visual Policy inputs and
schedules remain server-protected. Code Demo inputs are unavailable before
submission but must be delivered to the browser after submission, so they can
then be inspected and must not be described as protected hidden tests.

The browser worker prevents expensive Code from freezing the Studio UI, but it
does not make the result authoritative. Running untrusted candidate code in a
hosted bank or startup interview still requires a separate isolated server
worker/container with CPU, memory, time, and network limits.

## Hidden evaluation families

The ten server-only definitions cover:

1. changed category mix and bay ordering;
2. stadium arrival burst while exits continue;
3. charging outage during an EV surge;
4. exit-gate failure and recovery;
5. late reservation flood;
6. oscillating capacity closures;
7. simultaneous VIP, accessible, EV, large, and reserved demand;
8. shared-lane collapse and recovery;
9. adversarial priority/fairness pressure;
10. a 320-vehicle long-running incident schedule.

The tutorial uses the first six cases, the second problem uses the first eight,
and the Hard problem uses all ten.

## Scoring

Every scenario gates:

- complete stream resolution;
- minimum successful-departure ratio;
- maximum abandonment;
- zero or bounded hard violations;
- bounded closure rerouting;
- bounded congestion duration;
- a combined operating-penalty budget.

The operating penalty combines entry wait, exit wait, hard and preference
violations, abandonment, rerouting, congestion, and unresolved live queues. The
reported score converts completion, departure service, safety, patience,
recovery, and efficiency into 0–100. A suite passes only when every case passes
and the average reaches the challenge threshold.

## Implementation map

- real-time domain runtime: `lib/engine/worlds/parking.ts`
- visible worlds: `content/worlds/parking-interview-*.json`
- challenge briefs: `content/challenges/parking/23-*.json` through `25-*.json`
- server-only fixtures: `lib/interview/server/parkingSuites.ts`
- evaluator: `lib/interview/server/evaluateParkingSubmission.ts`
- Visual Policy route: `app/api/interview/submit/route.ts`
- Demo suite route: `app/api/interview/demo-suite/route.ts`
- Code worker: `features/studio/workers/interviewCodeEvaluator.worker.ts`
- shared scorer: `lib/interview/evaluation/scenarioEvaluation.ts`
- generic result panel: `features/studio/components/InterviewResultsPanel.tsx`
- renderer: `features/simulation/components/renderers/ParkingRenderer.tsx`
- regression coverage: `lib/interview/__tests__/parkingInterview.test.ts` and
  `lib/engine/__tests__/parking.test.ts`
