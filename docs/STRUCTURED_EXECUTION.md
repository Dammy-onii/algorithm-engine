# Structured Execution — planned upgrade

**Status: Proposed (design only — not implemented).** This documents an agreed
future improvement to how the engine executes authored intelligence, plus a
near-term set of Code-mode approachability fixes that can ship independently.

Nothing in the shipped engine changes until this is scheduled. Today's behaviour
is described accurately below so the migration is grounded, not hypothetical.

> A per-rule `THEN proceed/end` sequencing directive was prototyped as a
> lightweight first increment and then reverted; sequencing currently stays with
> multi-step bricks composed in the Functions tab.

---

## 1. The problem this solves

The visual layer today expresses two shapes well and one shape not at all.

**Grounding — what actually happens now:**

- Rules are evaluated in **authored top-to-bottom order**; the first rule whose
  `WHEN` is true *and* whose next action is possible runs
  ([ruleEngine.ts](../lib/engine/decision/ruleEngine.ts)).
- A rule's action can be a **multi-step brick** — a function whose `steps` are a
  fixed, flat sequence (e.g. `[turnRight, moveForward]`). When it fires, the
  engine **commits to the whole brick** and runs it one primitive per tick,
  *without* re-evaluating the rule list in between, interrupting only if the next
  primitive becomes unsafe ([simulation.ts](../lib/engine/simulation.ts),
  `activeBrick`).

So "turn right, **then** move forward" as one decision already works. What does
**not** work:

- A **fixed sequence cannot contain its own branching or loop.** A brick's `steps`
  is a flat array. "Move forward, **then if** wall do X **else** Y, **then repeat
  while** clear" cannot be expressed as one unit.
- Spreading that across several rules doesn't recover it, because each tick
  **re-evaluates from the top**, so an earlier rule can pre-empt the rest of an
  intended procedure.

This is the real ceiling: **the engine can express a fixed sequence, but not a
structured *procedure* (branching/looping inside a sequence).**

> Note: full procedural power already exists for advanced users via **Code mode**
> (a `decide(observation)` controller is real code with persistent state). This
> upgrade is about giving the **visual** layer the same structure, and unifying
> both behind one execution model.

## 2. The model: nodes + a per-agent frame stack

Replace "a list of actions run once" with **a tree of execution nodes**, run by a
**stack of frames**. Each tick, the engine looks at the top frame, does exactly
one atomic thing (enter a child, advance a cursor, or pop when done), executes at
most one world action, and returns.

**Node types (the whole "language"):**

| Node | Meaning | Exists today as |
|------|---------|-----------------|
| `action` | one primitive (`moveForward`, `routeToA`, …) | a single-action function |
| `sequence` | run children in order | a multi-step brick (`steps`) |
| `selector` | first child whose condition holds (ordered choice) | the ordered rule list |
| `conditional` | `if cond then A else B` | **new** — the real unlock |
| `loop` | `while cond do body` | **new** — add when first needed |

The wall-follower is then a `selector` of `sequence`s — exactly what it is now,
but as *one node type among several* rather than a hardcoded special case.

**Execution state moves onto the agent:**

```
Agent {
  stack:   Frame[]           // resumable execution position
  context: Record<…>         // shared scratch variables (locals)
}
Frame { node, cursor, locals }
```

`activeBrick` today is already a **single-frame executor** (a committed brick with
a cursor + per-primitive safety). This upgrade generalises it into a stack of
frames — evolution, not a teardown.

## 3. Invariants this MUST preserve (no shortcuts)

- **One atomic, visible action per tick.** A frame stack still yields exactly one
  step per tick from the top. "Watch it think" is non-negotiable and survives.
- **Deterministic replay.** Same brain + same seed → same run, unchanged.
- **The engine executes intelligence, it never creates it.** Nodes are authored
  data; the engine only walks them.
- **Existing content keeps working.** Every shipped world/challenge/brain must run
  unchanged after migration (see §5).
- **Action safety stays per-primitive.** An action is still checked against its
  precondition immediately before it runs; an unsafe step is not executed.

## 4. What we deliberately do NOT build yet

Per the "don't pre-build" principle — the frame-stack shape makes each of these
*additive later*, so none needs solving now:

- **Loops** — add the `loop` node when the first level actually needs one.
- **Recursion / backtracking** (DFS, N-Queens) — natural on a frame stack (push to
  recurse, pop to backtrack), but only if the platform commits to visualising
  classic algorithms, not just reactive agents.
- **Multiple agents / parallelism** — because state lives on the agent, this is
  "tick every agent's stack once" later; no engine-global state to unwind.

## 5. Migration path (phased, each independently shippable)

1. **Introduce the node type** and re-express today's model on top of it:
   ordered rules → a `selector` of `sequence`s; multi-step brick → a `sequence`.
   Mechanically close to current code; **behaviour identical**, all tests green.
2. **Replace `activeBrick` with a per-agent frame stack** holding one frame.
   Still single-agent, still one action/tick.
3. **Thread `context` (per-agent locals)** through frames from day one, even
   unused — cheap now, painful to retrofit.
4. **Add the `conditional` node** + its visual editor affordance. This is the
   expressiveness win users are asking for.
5. **Add `loop`** only when a challenge requires it.
6. **Unify authoring**: blocks, structured visual nodes, and Code mode all compile
   to the **same execution tree** the interpreter runs (see §6).

Each phase keeps the full suite, TypeScript, lint, and production build green
before the next begins.

---

## 6. Code mode approachability (near-term, ships independently)

The current Code editor is powerful but **unapproachable for a first-time user**:
faced with a blank `decide(observation)`, they don't know what fields the
observation has, what strings they may return, or that multi-step behaviour must
be sequenced by hand with instance fields. The maze example illustrates the
hidden knowledge required:

```js
class RightHandFollower {
  pendingTurnRights = 0;   // ← why do I need these?
  pendingMove = false;     // ← not obvious to a newcomer

  decide(observation) {
    if (observation.atGoal) return "wait";
    // …manages its own "turn then move" state across ticks…
  }
}
return new RightHandFollower();
```

Three things are invisible: **what can I observe**, **what can I return**, and
**why do I need `pending*` fields**. Fixes (no engine change required):

1. **Self-documenting observation.** Show, in the editor for the *current world*,
   the exact fields available — base senses (`wallAhead`, `atGoal`, `energy`, …)
   and this world's `observation.domain` facts with their human-readable labels
   (the same `DomainFlagSpec` labels the debug panel already uses). A maze author
   sees walls/goal; a finance author sees `onlineA`, `feeA`, `expectedCostA`, …
2. **Valid return actions listed inline.** Enumerate the exact action strings this
   world accepts — base movement + `world.module.domainActions` (e.g. Finance:
   `routeToA/B/C`, `hold`, `decline`). Returning anything else already errors;
   surface the allowed set *before* they guess.
3. **A world-specific starter template**, pre-filled instead of a blank editor, so
   the shape (`class … { decide(observation) { … } } return new …`) is never a
   mystery.
4. **Teach the one non-obvious rule explicitly:** the controller is called **once
   per tick** and returns **one action**; to do a multi-tick behaviour ("turn,
   then move") you **remember it in an instance field** and return the next piece
   on the next call. A short worked note + the template's comments cover this.
5. **A concise in-editor reference** (or a linked panel) for the observation
   contract and the tick lifecycle, drawn from [CODE_MODE.md](./CODE_MODE.md).

These are documentation/DX affordances around the existing Code path — they can
land well before the structured-execution engine work and immediately reduce the
"I don't know what to write" wall.

### How this connects to §2

The endgame is a single ladder where every rung compiles to the **same execution
tree**:

```
visual blocks  →  structured visual nodes (if / loop)  →  Code mode
                         ↘        ↘        ↙
                     one execution tree the interpreter runs
```

A newcomer arranges a few ordered rules. A more confident user adds visual `if`
and `loop` nodes. A power user writes a controller. None of them learn a different
runtime, and the same "one visible action per tick" holds throughout.

---

## Decision still open

The scope of §2/§4 depends on one product question: **is the platform for reactive
decision agents in operational worlds (maze, warehouse, finance, parking), or must
it also visualise classic algorithms (sorting, DFS, recursion)?** The reactive
answer makes §6 the priority and the `conditional` node a nice-to-have; the
"classic algorithms" answer makes the full frame-stack interpreter worth
committing to now. This doc is written so either path is a migration, not a
rewrite.
