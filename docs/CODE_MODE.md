# Code Mode — Editor, Simulation Runtime, and Interview Execution

This document explains what the **Code** tab currently does, how code receives
information from a simulation world, how one returned action changes that world,
why local **Apply & Run** and **Submit solution** are different, and
how the platform can safely support Python and other languages.

The most important distinction is:

> The editor collects source code. A runtime executes it. The simulation supplies
> observations and applies actions. An interview runner safely evaluates
> untrusted submissions. These are related components, but they are not the same
> component.

## 1. Current status in one minute

The Studio currently provides two alternative decision systems:

| Decision system | Authored with | Used by Apply & Run | Used by Submit solution |
|---|---|---:|---:|
| Visual policy | Rules, Conditions, States, Functions | Yes, when **Visual Policy** is selected | Yes — server evaluated |
| Code controller | JavaScript in the Code tab | Yes, when **Code Controller** is selected | Yes — browser evaluated in Demo mode |

The persisted **Active controller** selector decides which system handles the
next local run. Opening the Code tab or keeping source in it does not silently
change the selection. Rules and Code do not execute together and do not
automatically translate into one another.

The active-controller selector also determines what **Submit solution** sends
through evaluation. Visual Policy uses the server-owned evaluator. In the
current Demo mode, Code Controller requests the scenario suite only after the
submit click, then runs that JavaScript and the real simulation engine inside a
browser Web Worker. The candidate-facing card calls both paths hidden evaluation
scenarios; this document records that Demo Code results are useful for the demo
but are not tamper-proof interview evidence.

## 2. The four components

### 2.1 Code editor

The current editor is a controlled text area in
`features/engine/studio/components/layers/ControllerEditor.tsx`. It:

- displays and updates `brain.controllerCode`;
- saves that source with the rest of the visual brain in browser storage;
- provides one search across primitive actions and observable facts;
- groups large world vocabularies into shared observation, transaction/queue,
  provider, vehicle/facility, and general world-state accordions;
- can insert a JavaScript example for every current world;
- does not itself execute or validate the program.

Calling it an editor does not make it a compiler. Syntax checking and execution
begin only when the user presses **Apply & Run**.

### 2.2 Controller compiler

`lib/authoring/controllerCompiler.ts` evaluates the current JavaScript source in
the browser and requires the result to be an object with:

```ts
interface AgentController {
  decide(observation: Readonly<Observation>): ActionType;
  reset?(): void;
}
```

The source must therefore return a controller instance:

```js
class Controller {
  decide(observation) {
    return "wait";
  }
}

return new Controller();
```

The instance is created once for a run. Its fields remain alive between ticks,
which allows object-oriented algorithms to retain internal state:

```js
class Controller {
  decisions = 0;

  decide(observation) {
    this.decisions += 1;
    return "wait";
  }
}

return new Controller();
```

### 2.3 Simulation engine

`lib/engine/simulation.ts` owns the execution loop. It calls the controller once
per tick, validates the returned primitive action, asks the active world to
apply that action, advances the world, and creates the debug snapshot.

The controller does not receive the mutable `World` object. It receives an
observation snapshot and returns an action request.

### 2.4 World module

The active `WorldModule` owns domain-specific mechanics:

- Maze owns maze completion facts.
- Simple Decisions owns the item queue, the two blocks, and item facts.
- Finance owns transactions, provider state, queues, retries, failures, and
  timeouts.
- Parking owns vehicles, spaces, gates, movements, releases, and congestion.

Each module contributes:

- facts through `observe(world)`;
- primitive actions through `domainActions`;
- action behaviour through `applyAction(world, action)`;
- autonomous changes through `advanceTick(world)`;
- completion through `resolveStatus(world)`.

This is how the same Code controller contract can operate across different
simulation types without embedding Finance or Parking logic in the engine.

## 3. What happens when Apply & Run is pressed

The actual current flow is:

```text
VisualBrain in React state
        │
        ├── compileBrain(brain)
        │       └── goals, states, rules, functions, conditions, memory
        │
        └── controllerMode === "code"?
                ├── no  ─► visual policy
                └── yes ─► compileController(controllerCode)
                              └── AgentController instance

BrainSource + optional AgentController
        │
        ▼
createSimulationSession(...)
        │
        ▼
Simulation
        │
        ▼
tick() repeatedly
```

`StudioPage.onRun` compiles the visual brain for the shared runtime contract. It
compiles Code only when `brain.controllerMode === "code"` and passes the
selected decision source to `Simulation`.

Inside `Simulation.tick()`:

```text
if a controller exists:
    use controller.decide(observation)
    do not select a visual rule
else:
    evaluate Goal → State → Rules → Function
```

Consequently, tab visibility and controller ownership are separate. The
selector is always the source of truth.

## 4. The observation: how code sees the environment

Before every decision, `buildObservation(world)` creates a fresh read-only
snapshot.

### 4.1 Shared facts

Common grid/agent values are direct properties:

```js
observation.tick
observation.position
observation.direction
observation.wallAhead
observation.wallLeft
observation.wallRight
observation.goalVisible
observation.atGoal
observation.visitedAhead
observation.visitedCount
observation.energy
```

Maze code commonly uses these direct values:

```js
if (!observation.wallRight) return "turnRight";
if (!observation.wallAhead) return "moveForward";
return "turnLeft";
```

### 4.2 Domain facts

World-specific facts live in:

```js
observation.domain
```

Finance code commonly creates a shorter local name:

```js
const facts = observation.domain;
```

`facts` is not an engine keyword. It is an ordinary JavaScript variable. These
statements are equivalent:

```js
const facts = observation.domain;
const financeState = observation.domain;
const environment = observation.domain;
```

A Finance snapshot may contain:

```js
{
  hasTransaction: true,
  amount: 12000,
  isPayroll: false,
  isPriority: true,
  deadlineRemaining: 7,
  retryCount: 1,

  canRouteA: false,
  canRouteB: true,
  canRouteC: true,

  successRateB: 99.5,
  currentLatencyB: 1150,
  expectedCostB: 0.35,
  capacityRemainingB: 2,
  queueLengthB: 2,
  congestionB: 0.5,
  healthScoreB: 92
}
```

These are calculated by the Finance module from the current transaction stream,
provider schedule, in-flight work, capacity, deadlines, failure history, and
running score. They are recalculated on the next tick after the world changes.

The world deliberately exposes facts such as `feeA` and `canRouteA`, not an
answer such as `bestProviderA`. Selecting the provider remains the candidate's
algorithmic responsibility.

## 5. One complete tick

Every Code-mode tick follows this sequence:

```text
1. OBSERVE
   Build a fresh base + domain snapshot from the current world.

2. DECIDE
   Call the same controller instance:
   action = controller.decide(observation)

3. VALIDATE ACTION NAME
   Confirm that the returned string is a base action or an action contributed
   by the active WorldModule.

4. CHECK ENGINE PRECONDITIONS
   For example, moveForward requires !wallAhead.
   An unsafe movement request becomes wait.

5. APPLY
   World.apply({ type: action }) delegates domain actions to the active module
   and otherwise applies base movement.

6. ADVANCE
   Increment the world tick and run module-owned autonomous changes.

7. RESOLVE
   Complete provider work, process arrivals/retries/timeouts, update scoring,
   and determine whether the run has completed.

8. SNAPSHOT
   Store the observation, returned action, status, and metrics for the renderer
   and debug panel.
```

The controller returns one primitive action, not a complete action list:

```js
return "turnRight";                    // valid
return ["turnRight", "moveForward"];   // invalid
```

A class field can remember the second step:

```js
class TurnThenMove {
  moveNext = false;

  decide(observation) {
    if (this.moveNext) {
      this.moveNext = false;
      return "moveForward";
    }

    if (!observation.wallRight) {
      this.moveNext = true;
      return "turnRight";
    }

    return "moveForward";
  }
}

return new TurnThenMove();
```

## 6. Finance example: from action to environmental change

Suppose the controller returns:

```js
return "routeToB";
```

The Finance module then:

1. selects the current eligible transaction;
2. records Provider B as the attempted route;
3. adds B's processing fee;
4. checks online status, supported transaction type, amount limit, and capacity;
5. records an immediate failed attempt when the route is invalid;
6. otherwise marks the transaction as `processing`;
7. calculates its future completion tick from provider latency.

After the world clock advances, Finance independently:

- releases scheduled arrivals into the waiting queue;
- completes due provider work;
- uses the seeded reliability model to resolve success or failure;
- returns retryable failures to the queue after backoff;
- applies provider outage/recovery schedules;
- expires transactions that exceed their deadlines;
- updates queue pressure and the overall score.

The controller sees the result only through the next observation. This preserves
the boundary:

```text
controller chooses an action
world owns the consequences
```

## 7. Simulation time and playback speed

Code mode is tick-based. It is not tied directly to actual wall-clock seconds.

For example, Peak Hour Finance uses a `tickDurationMs` of 1,000. One simulation
tick therefore represents approximately one virtual second for provider latency
and transaction deadlines. A 5,200 ms provider operation takes six simulation
ticks.

Studio can play those ticks faster. At 20 ticks per real second, the virtual
simulation advances twenty seconds during one real second of playback. Changing
the playback speed does not change the decisions or deterministic outcomes; it
only changes how quickly the user watches them.

## 8. Rules mode and Code mode

Rules and Code are currently alternative decision sources, not collaborating
layers.

Both are stored inside the same `VisualBrain`:

```ts
{
  rules: [...],
  functions: [...],
  states: [...],
  derived: [...],
  controllerMode: "visual",
  controllerCode: "class Controller { ... }"
}
```

They do not synchronize:

- changing a Rule does not rewrite JavaScript;
- changing JavaScript does not rewrite a Rule;
- Rules remain saved while Code is active;
- selecting **Code Controller** takes control on Apply & Run;
- selecting **Visual Policy** returns control to Rules without deleting Code.

### Can synchronization be added?

Visual Rules can be converted **one way** into generated code because the rule
model has a restricted structure:

```text
WHEN isPriority && canRouteB → routeToB
WHEN canRouteA → routeToA
ELSE → hold
```

can become:

```js
if (facts.isPriority && facts.canRouteB) return "routeToB";
if (facts.canRouteA) return "routeToA";
return "hold";
```

General code cannot reliably be converted back into cards. Arbitrary code may
contain loops, arrays, classes, helper functions, dynamic scoring, recursion, or
data structures that the visual policy model cannot represent.

Peak Hour Payment Switch is a useful example. Its reference Code Controller
builds an array for providers A, B, and C from `observation.domain`, filters by
`canRouteX`, removes the last failed provider during a retry, calculates a
different score for urgent and routine payments, sorts by that score, and
returns the winning provider's action. The regression in
`lib/engine/__tests__/controller.test.ts` verifies that controller against every
visible level-21 objective.

The product uses an explicit mode selector:

```text
Visual Policy  |  Code Controller
```

A future **Generate code from current policy** action can create a one-way
snapshot, but must not promise permanent two-way synchronization.

## 9. Current Submit solution behaviour

Local **Apply & Run** and **Submit solution** are different paths.

### Apply & Run

```text
JavaScript source
    ↓ browser new Function(...)
Controller instance
    ↓
Visible local simulation
```

### Visual Policy submission

```text
Visual Rules/States/Functions
    ↓ compileBrain(...)
Restricted BrainSource JSON
    ↓ POST /api/interview/submit
Server-owned hidden suite
    ↓
Results and diagnostics
```

The server accepts the compiled visual policy, creates each protected world,
and runs the same `Simulation` without a Code Controller.

The restricted visual condition language is safe to evaluate on the application
server because it is not arbitrary JavaScript. It supports known identifiers,
numbers, comparisons, boolean operators, and parentheses. It cannot access the
filesystem, environment variables, network, or server process.

### Code Controller submission in Demo mode

```text
Candidate JavaScript source
    ↓ explicit Submit solution click
POST /api/interview/demo-suite
    ↓ scenario definitions returned with Cache-Control: no-store
Browser Web Worker
    ├── compileController(source) once per scenario
    ├── run the real Simulation with that controller
    └── apply the shared Finance/Parking guardrails
    ↓
Results and diagnostics
```

The scenarios are not imported into the Studio page bundle and are not
requested during **Apply & Run**. They are requested only after an explicit
Code-mode submission. Each scenario receives a new controller instance, so
class state can persist across ticks inside one case but cannot leak into the
next case. Production uses the worker to keep expensive controller code off the
page's main UI thread and terminates the whole evaluation after two minutes.

During `next dev`, Next 16.2's Turbopack worker bootstrap can be emitted with a
malformed source-map boundary. Studio therefore uses a development-only
browser-page fallback, yields between scenarios so progress can render, and
keeps the same simulation and scoring contract. This fallback is for local Demo
development only; production continues to use the worker bundle.

The candidate-facing result panel uses the simpler label **hidden evaluation
scenarios**. Operationally, anything delivered to a browser can be inspected or
modified, and a modified client can fabricate a result. The current Code path is
therefore suitable for the present demo and product walkthrough, but it must not
be presented to a bank as authoritative or tamper-proof candidate evidence.

## 10. Why submitted code needs an isolated runner

Executing untrusted candidate source with `new Function`, `eval`, or Node's `vm`
inside the application server is unsafe. Candidate code could:

- run forever or allocate excessive memory;
- crash or block the application process;
- access application secrets or server files;
- make unwanted network requests;
- interfere with other candidates;
- inspect or leak hidden evaluation data.

A production interview runner should execute each submission in an isolated,
ephemeral process/container with:

- CPU and wall-clock time limits;
- memory and output limits;
- no application filesystem access;
- no application environment variables;
- no network access by default;
- a disposable working directory;
- process termination on timeout;
- version-pinned language runtimes;
- attempt limits, audit logs, and authenticated candidate sessions.

## 11. Supporting Python and other languages

The Code editor should not decide how a language runs. Add a language selection
and route the source through a language-specific runner adapter:

```ts
interface LanguageAdapter {
  language: "javascript" | "python" | "java" | "go" | "rust" | "cpp";
  prepare(source: string): PreparedProgram;
  start(program: PreparedProgram, limits: ExecutionLimits): ControllerProcess;
}
```

Every language should implement the same external controller protocol:

```text
simulation sends one observation
candidate program returns one action
candidate process remains alive for the next tick
```

### Recommended process protocol

A language-independent JSON Lines protocol is sufficient.

Runner sends:

```json
{"type":"observation","tick":12,"domain":{"hasTransaction":true,"canRouteA":false,"canRouteB":true}}
```

Candidate process responds:

```json
{"type":"action","action":"routeToB"}
```

The process stays alive so Python objects, Java class fields, Go structs, and
JavaScript class instances can all retain state between ticks.

The runner should enforce both:

- a short per-decision timeout;
- a total submission timeout and resource budget.

### Python in the browser

Python can run in the browser through a WebAssembly-based Python runtime such as
Pyodide. It should run in a Web Worker so an infinite loop does not freeze the
page.

This is suitable for:

- tutorials;
- visible sample cases;
- offline experimentation;
- fast Apply & Run feedback.

Trade-offs include:

- a larger runtime download and slower first start;
- limited support for native/system packages;
- different performance from production Python;
- memory pressure on lower-powered devices;
- no trustworthy protection of hidden cases.

JavaScript can continue to run natively in a Web Worker. Other languages can be
compiled to WebAssembly where practical, but maintaining many browser compilers
is substantially more complex than maintaining server runner images.

## 12. Where should test cases run?

Use a hybrid model.

| Test category | Recommended location | Reason |
|---|---|---|
| Examples shown in the problem | Browser | Fast feedback; secrecy is unnecessary |
| Visible sample tests | Browser | Candidate can inspect them anyway |
| Candidate-authored custom tests | Browser | Immediate experimentation |
| Hidden interview tests | Isolated server runner | Protect test data and verify the submitted program |
| Final scoring suite | Isolated server runner | Authoritative, auditable, resource-controlled result |

### Do not download protected cases into the browser in production

Anything sent to a browser can be inspected through developer tools, memory,
network logs, or modified client code. Obfuscation does not make a hidden case
secret. The current Demo-mode Code path intentionally accepts this trade-off and
labels its cases as demo scenarios rather than protected server results.

### Can the browser run code while the server only checks answers?

That model is weak for this platform.

For a simple function such as `twoSum(input)`, the browser could run the code and
send an output to the server. The server could check the output, but it cannot
prove that the submitted source produced it. A modified client could submit a
fabricated answer.

For a stateful simulation, the problem is larger. The controller makes a
decision on every tick. If hidden observations are sent to the browser, the user
can record and reconstruct the hidden scenario. If only final metrics are sent,
the browser cannot make environment-dependent decisions.

A remote tick API is technically possible:

```text
server sends hidden observation
browser returns action
server advances hidden world
repeat
```

but it:

- reveals the hidden observation stream;
- cannot prove that the declared source selected each action;
- adds a network round trip to every tick;
- allows replay and manual action injection;
- makes thousands-of-ticks evaluations slow and fragile.

It can be useful for non-secure practice, but it is not the preferred technical
interview architecture.

### Preferred hidden-test flow

```text
Candidate submits source + language
        ↓
Server creates isolated runner
        ↓
Runner compiles/starts candidate process
        ↓
Server-owned simulation sends observations internally
        ↓
Candidate process returns actions internally
        ↓
Simulation applies actions and scores hidden scenarios
        ↓
Runner is destroyed
        ↓
Only results and diagnostics are returned
```

The hidden worlds never leave the trusted server environment, and the server
knows that the submitted program produced the actions.

## 13. Recommended delivery stages

### Stage 1 — clarify the current product

- Add an explicit **Visual Policy / Code Controller** selector.
- Show the active mode beside Apply & Run.
- Warn when saved Code is overriding newly edited Rules.
- Keep browser JavaScript for visible runs.

### Stage 2 — browser language adapters

- JavaScript submission execution now runs in a Web Worker in Demo mode.
- Add Python through a WebAssembly worker.
- Run visible examples and candidate-authored tests locally.
- Standardize observation/action messages.

### Stage 3 — isolated interview runner

- Submit `{ language, source, challengeId }`.
- Start an ephemeral version-pinned language environment.
- Use the same observation/action protocol for every language.
- Run visible confirmation cases followed by hidden suites.
- Enforce per-tick and whole-run limits.
- Stream case progress without returning hidden inputs.

### Stage 4 — additional languages

- Add one runner image/adapter at a time.
- JavaScript/TypeScript and Python should come first.
- Java, Go, C++, and Rust can follow based on interview demand.
- Keep one engine contract rather than implementing different simulation logic
  for each language.

## 14. Source map

| Responsibility | Current source |
|---|---|
| Code tab UI | `features/engine/studio/components/layers/ControllerEditor.tsx` |
| Code stored in visual brain | `lib/authoring/types.ts` |
| Apply & Run selection | `features/engine/studio/pages/StudioPage.tsx` |
| Browser JavaScript compiler | `lib/authoring/controllerCompiler.ts` |
| Controller interface | `lib/engine/controller.ts` |
| Observation creation | `lib/engine/decision/observation.ts` |
| Controller tick branch | `lib/engine/simulation.ts` |
| World action/update lifecycle | `lib/engine/world/world.ts` |
| Finance observations/actions | `lib/engine/worlds/finance.ts` |
| Visual brain compiler | `lib/authoring/brainCompiler.ts` |
| Visual Policy submission API | `app/api/interview/submit/route.ts` |
| Demo suite delivery API | `app/api/interview/demo-suite/route.ts` |
| Browser Code evaluator | `features/engine/studio/workers/interviewCodeEvaluator.worker.ts` |
| Shared scenario scoring | `lib/interview/evaluation/scenarioEvaluation.ts` |
| Finance hidden evaluator | `lib/interview/server/evaluateFinanceSubmission.ts` |

## 15. Final architectural rule

Use the browser for responsive learning feedback and explicitly labelled demo
evaluation. Use an isolated server runner for authoritative protected
evaluation.

The simulation engine should expose one stable observation/action protocol. A
JavaScript class, Python object, Java class, Go process, or Rust program can then
participate in the same simulation without duplicating Finance, Parking, Maze,
Drone, or Simple Decisions mechanics.
