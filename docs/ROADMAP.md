# Algorithm Engine — Roadmap

> **Planning history.** Some sequencing and terminology below predate ordered
> rules and Code mode. Current implemented behaviour and pending work are tracked
> in [CHANGELOG.md](./CHANGELOG.md); use it together with the current reference
> docs rather than treating this roadmap as an implementation contract.

The long view. Milestones 1–2 are built; Milestone 3 is in progress. This document
describes **all eight milestones** — what each proves, how it is achieved on top of
the existing foundation, and how it can be presented in a way that is distinctly
*this* platform and not a generic coding game.

> Guiding principle: every milestone strengthens **one** foundation rather than
> branching into a separate product. By the time we reach competition, we are not
> building a "competition mode" — we are putting more people on top of an engine, an
> authoring system, a progression model, and a scoring system already proven
> independently.

---

## Where we are

| # | Milestone | Proves | Status |
|---|-----------|--------|--------|
| 1 | Core Simulation & Decision Engine | The engine can execute externally-defined intelligence | ✅ Done |
| 2 | Intelligence Authoring System | Non-programmers can *author* that intelligence visually | ✅ Done |
| 3 | Intelligence Composition | Users can build *abstractions*, not just configure an agent | 🟨 In progress (library pending) |
| 4 | Learning & Progression | The platform can *teach* — complexity grows naturally | 🟨 In progress (core shipped) |
| 5 | Hybrid Authoring | The same intelligence is authorable as blocks **or** code | ⬜ Planned |
| 6 | Multiple Worlds | The engine is genuinely domain-agnostic | 🟨 Warehouse Modes 1–4 shipped; non-grid Stage 2 and broader milestone in progress |
| 7 | Real-Time Collaboration | Multiple people can co-author one agent | ⬜ Planned |
| 8 | Competition | Teams compare intelligence live, with scoring + spectating | ⬜ Planned |

Two themes cut across every milestone and are called out at the end: the **Player &
Intelligence Library**, and **Quality Metrics**.

---

## Milestone 1 — Core Simulation & Decision Engine ✅

**Proves:** the engine executes intelligence; it does not create it.

A generic loop — observe → decide → act → update → render — runs an agent inside a
data-driven world using a data-driven brain. The maze is only the first test
environment. Swapping the world or the brain requires no engine change. Delivered
with multi-step bricks, a safe (no-`eval`) condition language, a debug panel exposing
every internal decision, and a settle-on-goal win condition.

See [`MILESTONES.md`](./MILESTONES.md) for the full spec and success criteria.

---

## Milestone 2 — Intelligence Authoring System ✅

**Proves:** someone who has never seen JSON can author working intelligence.

A visual Studio produces the exact same five-layer brain the engine already consumes.
Challenge system, plain-English "Current Intelligence" summary, five layer editors,
JSON preview (proving the visual model compiles to real engine input), localStorage
persistence. The engine stayed untouched — the editor is only a *producer* of brains.

See [`MILESTONE2.md`](./MILESTONE2.md).

---

## Milestone 3 — Intelligence Composition 🟨

**Proves:** the platform is *programming*, not rule configuration — users design
their own abstractions and carry them between challenges.

### The core idea

Before M3, the platform let users compose **actions** (multi-step bricks) but not
**perception** (conditions were consumed, never named). That asymmetry is why
arranging rules felt hollow: half the vocabulary grew with the user and half was
frozen — and the frozen half was the half that expresses *understanding*.

M3 closes the gap and turns the authoring layer into a place where users build
reusable assets.

### How it is achieved (built so far)

- **Derived conditions** — user-named expressions over existing flags
  (`deadEnd = wallAhead && wallLeft && wallRight`). The perceptual mirror of a
  multi-step brick: new *knowledge*, not new senses. Implemented as a 6th brain
  layer (`conditions.json`), evaluated recursively by the existing safe evaluator
  with cycle detection, validated at load time so mistakes surface on Apply.
  ([condition.ts](../lib/engine/decision/condition.ts),
  [loader.ts](../lib/engine/runtime/loader.ts))
- **Conditions tab** — read-only reference for every engine flag (with per-challenge
  availability) plus a composer for derived conditions.
  ([ConditionEditor.tsx](../app/components/studio/layers/ConditionEditor.tsx))
- **Objectives** — challenges define machine-checkable objectives (primary + bonus)
  evaluated against run metrics; they tick off after each run and grade *quality*,
  not just correctness. This is the scoring substrate everything later depends on.
  ([objectives.ts](../lib/authoring/objectives.ts))
- **States, honestly scoped** — read-only where a challenge has one mode, editable at
  Challenge 5 where designing modes is the exercise. A state earns its keep only when
  a second mode exists to contrast with.

### Still to build in M3

- **Personal intelligence library** — saving a derived condition or a function as a
  named asset that persists across challenges and can be imported. This is the shift
  from "solve this challenge" to "build your own toolkit". (See *Player & Library*.)
- **Library management UI** — browse, rename, version, and delete owned assets.

### Unique presentation

- Show the **two composition ladders side by side** — Actions (primitives → bricks →
  strategies) and Perception (flags → derived conditions → concepts) — so users
  literally see they are extending the language in both directions.
- When a rule uses a derived condition, render it in the user's own words
  (`WHEN deadEnd`) with the underlying expression on hover — their vocabulary appears
  in their own program.
- Objectives presented as a **quality scorecard**, not a pass/fail gate: "solved in 54
  ticks with 5 rules — can you do it in 40 with 3?"

See [`MILESTONE3.md`](./MILESTONE3.md) for the detailed design.

---

## Milestone 4 — Learning & Progression ⬜

**Proves:** the platform can *teach*. A non-programmer working through it naturally
arrives at writing sophisticated algorithms.

### How it is achieved

No new engine features — this milestone builds the *educational journey* on top of
what exists. Each challenge unlocks exactly one new idea, in order:

`sequencing → conditions → priority → reusable functions → derived conditions →
state machines → memory → optimization`

- **Concept gating** — a challenge exposes only the tabs/flags/bricks its concept
  needs (the `availableBricks` / `availableConditions` / `functionsUnlocked` /
  `statesUnlocked` fields already do this; M4 formalizes them into a curriculum).
- **A concept registry** — each concept has an id, a teaching challenge, a one-line
  explanation, and prerequisites. The UI reveals a concept only once its
  prerequisites are complete.
- **Adaptive hints** — hints escalate: nudge → worked example → the rule itself,
  triggered by repeated failed runs (the objective results already tell us *why* a
  run failed).
- **Progress model** — per-user concept mastery derived from which objectives (incl.
  bonus) they have satisfied.

### Unique presentation

- A **skill tree**, not a level list: concepts as nodes, prerequisites as edges,
  mastery shown by which bonus objectives the user has cleared. Locked concepts are
  visible-but-dimmed so the learner sees where they are heading.
- "You just learned **priority**" moments — a short, concrete callout the first time a
  concept is used successfully, tying the abstract idea to what the robot just did.
- Every concept introduced by *breaking* the previous solution: the new challenge is
  one the learner's current toolkit cannot solve, which motivates the new idea rather
  than presenting it cold.

---

## Milestone 5 — Hybrid Authoring ⬜

**Proves:** blocks and code are two views of the *same* intelligence — removing the
intimidating jump from visual programming to text.

### How it is achieved

The brain is already a clean intermediate representation (IR). M5 adds alternate
*views* of that IR, never a second engine:

- **Visual → pseudocode** — render a VisualBrain as readable pseudocode
  (`while not at goal: if wall ahead → turn left`). Pure projection of the existing
  model; no new execution path.
- **Pseudocode → code** — the same view becomes editable JS/TypeScript for a single
  function or rule, transpiled back to the IR (or run in the existing sandbox — note
  `runtime/sandbox.ts` was reserved for exactly this in the original architecture).
- **Code → graph** — handwritten logic visualized as the same decision graph, so the
  two directions round-trip.

Guardrail: the engine still executes the IR. Text and blocks are authoring surfaces,
so a brain authored either way remains inspectable, scoreable, and competition-legal.

### Unique presentation

- A **three-pane synchronized view**: blocks ⇄ pseudocode ⇄ code, editing any pane
  updates the others live. This is the platform's signature moment — the "aha" that
  blocks *are* code.
- A per-function **"reveal the code" toggle** so a learner graduates one brick at a
  time instead of switching the whole project to text.
- Diffing across representations: show that a visual edit and the equivalent code edit
  produce the identical IR.

---

## Milestone 6 — Multiple Worlds 🟨

**Proves:** the engine is genuinely domain-agnostic — the biggest architectural claim.

### How it is achieved

Introduce a second environment that is a *different problem*, not a harder maze:
warehouse automation, traffic routing, package delivery, robot-vacuum coverage, or
search-and-rescue. The bar: the same decision architecture (goals → states → rules →
functions → conditions → memory) works **without engine modification**.

**Current vertical slice:** Warehouse Modes 1–4 are shipped at explicit project
priority, ahead of the previously planned M5 sequencing. They use Stage 1 realistic
grid aisle layouts, a `warehouse` world module, external package/delivery/station
data, and warehouse capabilities (`pickUp`, `deliver`, `charge`). This proves the
behavioural module boundary, but it does not yet satisfy the full M6 bar of a
non-grid spatial world interface, dynamic warehouse systems, or multi-robot work.
See [WAREHOUSE_AUTOMATION.md](./WAREHOUSE_AUTOMATION.md).

- Generalize `world.ts` from a maze grid to a world *interface* (tiles, entities,
  legal actions, observation builder) that a maze is one implementation of.
- New worlds ship new observation flags and possibly new primitive actions — the
  first legitimate expansion of the engine's *capabilities* (vs. the user's
  vocabulary). Memory/objects (pick-up/carry/drop) land here.
- Prove reuse: a derived condition or function authored for the maze should still make
  sense (or transfer with light edits) in the new world.

### Unique presentation

- A **"same brain, new world" demo**: take a user's maze intelligence and drop it into
  a warehouse to show what transfers and what doesn't — concretely validating the
  domain-agnostic claim to the user, not just in a doc.
- Worlds as a gallery, each with its own objectives and metrics, sharing one authoring
  language.

---

## Milestone 7 — Real-Time Collaboration ⬜

**Proves:** multiple people can co-author one agent's intelligence — collaboration
*before* competition.

### How it is achieved

- Shared brain document with real-time sync (CRDT/OT). The brain is small structured
  JSON, which is friendly to conflict-free merging.
- Layer- or asset-level presence: one person on movement rules, another on the
  function library, another on conditions — the live simulation updates as they edit.
- Server authority for the run so all collaborators watch the same ticks.

### Unique presentation

- **Roles that map to the architecture**: "navigator" (rules/states), "toolsmith"
  (functions/conditions), "strategist" (goals/objectives). The layered brain already
  divides the work naturally.
- Live cursors *in the decision graph*, so you see a teammate reshaping a rule while
  the robot reacts.

---

## Milestone 8 — Competition ⬜

**Proves:** the whole stack composes into a spectator sport — the original inspiration.

### How it is achieved

By now the engine, editor, progression, scoring, and collaboration all exist. A
competition is: same challenge → each team authors independently → runs are scored and
replayed. Almost entirely assembly:

- Deterministic runs + seeds so results are reproducible and replayable.
- Scoring from the M3 metrics substrate (efficiency, economy, simplicity, robustness).
- Replay + spectator view driven by the existing debug architecture — every decision
  is already exposed.

### Unique presentation

- **Audiences watch consequences, not code**: robots navigating, warehouses operating,
  resources collected — with commentary explaining *why* one algorithm outperforms
  another, backed by the live decision trace.
- Side-by-side replays synced to the same tick, with each agent's active rule
  highlighted — turning "whose code is better" into something legible to a crowd.
- Bracket formats where later rounds introduce a *new world* (M6), rewarding general
  intelligence over a memorized maze solution.

---

## Cross-cutting theme A — The Player & Intelligence Library

The project has an engine, an editor, and challenges — but not yet a strong concept of
a **player** who accumulates work. This is what turns a puzzle game into something that
resembles software engineering, where you build on previous work instead of rewriting.

**The model:** completing challenges unlocks reusable, *named* assets —
`FollowLeftWall`, `AvoidDeadEnds`, `EfficientSearch` — that become permanent property
of the player. Future challenges encourage importing and *improving* them rather than
starting from scratch.

**How it is achieved:** functions and derived conditions are already portable data. A
library is (1) a per-player store of these assets, (2) import into any challenge's
brain, and (3) versioning so an improved `FollowLeftWall` propagates. Introduced in
M3, deepened by M4 (the curriculum teaches *when* to reach for a library asset), and
made competitive in M8 (teams bring their libraries).

**Presentation:** a personal "toolkit" the player grows — each asset with the
challenge it was forged in, its metrics, and where it has been reused. Reuse is
celebrated, not hidden.

## Cross-cutting theme B — Quality Metrics

Reaching the goal is the floor. The platform's philosophy is about *algorithm
quality*, so success must be measurable beyond correctness:

- **Efficiency** — ticks, moves, path optimality
- **Economy** — energy used
- **Simplicity** — rule count, function count, states used
- **Reusability** — how much came from the library vs. bespoke
- **Robustness / adaptability** — does the same brain solve *variations* of the
  challenge? (pairs with M6)
- **Complexity / maintainability** — depth of the decision graph, condition nesting

**Status:** the metrics substrate began in M3 (`RunMetrics` +
[objectives.ts](../lib/authoring/objectives.ts)). Each later milestone consumes it:
M4 uses it for adaptive feedback and mastery, M8 for scoring and commentary.

---

## Sequencing rationale

Each milestone validates a new assumption and depends only on proven layers below it:

1. **M3** makes authoring feel like programming (composition + a library).
2. **M4** makes it teachable (progression over that richer language).
3. **M5** removes the blocks-vs-code wall (two views of one IR).
4. **M6** proves the engine is general (a truly different world).
5. **M7** puts multiple people on it (collaboration).
6. **M8** turns it into a sport (competition on top of all of the above).

Do not build past M5 yet. M6–M8 are documented here so the foundation laid now
(metrics, library, IR-as-source-of-truth) is shaped to receive them without rework.
