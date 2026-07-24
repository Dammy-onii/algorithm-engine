# Authoring a Brain — Rules, States, Functions & More

This is the guide to writing an agent's **brain**: the five data files the engine
executes. You can edit all five live in the browser (the tabbed editor under the
simulation) or on disk in `brain/*.json`. The engine never changes — your brain is
what makes the robot behave.

- New here? Read [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) first.
- Want the engine internals? See [BUILD.md](./BUILD.md) and
  [MILESTONES.md](./MILESTONES.md).

---

## The six layers

A brain is six JSON files that form a hierarchy — from "what am I trying to do"
down to "what do I physically do this tick":

| File | Layer | Answers |
|------|-------|---------|
| `goals.json` | Goals | What are my priorities? |
| `states.json` | States | What mode am I in? |
| `rules.json` | Rules | Given what I see, what should happen? |
| `functions.json` | Functions ("bricks") | How is it actually done? |
| `conditions.json` | Conditions (derived) | New named knowledge from existing senses |
| `memory.json` | Memory | Initial remembered data |

Each tick, the engine runs them top-to-bottom to produce **one** action:

```
Observation → Goal → State → Rule → Function → Action
```

---

## Anatomy of a rule

A rule lives in `rules.json` and reacts to the current situation:

```json
{
  "id": "explore-spot-goal",
  "state": "explore",
  "when": "goalAhead",
  "do": "step",
  "setState": "seek",
  "priority": 100,
  "description": "Goal came into view — start seeking and step toward it."
}
```

| Field | Required | Meaning |
|-------|----------|---------|
| `id` | ✅ | A name; shown as "Triggered rule" in the debug panel. |
| `when` | ✅ | Condition expression. If it's `true`, the rule can fire. |
| `do` | ✅ | Id of the function (brick) to run — must exist in `functions.json`. |
| `state` | — | Only consider this rule while in that state. Omit = any state. |
| `setState` | — | On firing, also switch into this state (must exist in `states.json`). |
| `priority` | — | When several rules' `when` are true, the highest priority wins. Default `0`. |
| `description` | — | Free text for humans. |

**How a rule is chosen:** the engine takes the rules whose `state` matches the
active state (plus rules with no `state`), sorts them by `priority` (high → low),
and fires the **first** one whose `when` is `true`. If none match, the agent waits.

---

## Conditions — the `when` language

Conditions are plain strings evaluated against the current observation. It is a
small, safe language (not JavaScript — no arbitrary code runs).

**Operators:** `&&` (and), `||` (or), `!` (not), parentheses, and the comparisons
`< > <= >= == !=`.

**Flags & values you can reference:**

| Name | Type | Meaning |
|------|------|---------|
| `wallAhead` / `wallLeft` / `wallRight` | bool | Wall (or edge) in that direction relative to facing. |
| `goalVisible` | bool | Clear straight line to the goal along a corridor. |
| `goalAhead` | bool | `goalVisible` **and** the goal is straight in front. |
| `atGoal` | bool | Standing on the goal. |
| `visitedAhead` | bool | The tile directly ahead was already visited. |
| `visitedCount` | number | How many distinct tiles visited so far. |
| `energy` | number | Remaining energy (`Infinity` if the world has none). |
| `tick` | number | Current simulation tick. |
| `always` / `never` | bool | Constant `true` / `false`. |

**Examples:**

```
"always"                        // fires whenever reached in priority order
"!wallAhead"                    // no wall in front
"wallAhead && !goalVisible"     // blocked and can't see the goal
"energy < 20"                   // low on energy
"goalVisible || visitedAhead"   // see the goal, or I've been ahead before
```

An empty string `""` means "always".

---

## Derived conditions — naming your own perception

Rules consume conditions; `conditions.json` lets you **name new ones** built from the
existing flags — the perceptual mirror of composing a multi-step brick:

```json
{
  "conditions": [
    { "id": "deadEnd", "expr": "wallAhead && wallLeft && wallRight" },
    { "id": "canSprint", "expr": "energy > 50 && goalVisible" },
    { "id": "trapped", "expr": "deadEnd && energy < 10" }
  ]
}
```

Now a rule can read `"when": "deadEnd"` instead of repeating the expression. Derived
conditions may reference other derived conditions (`trapped` uses `deadEnd`).

**They add vocabulary, not senses.** A derived condition can only recombine flags the
engine already computes — you cannot invent `enemyNearby` if nothing perceives an
enemy. The loader rejects, on Apply: shadowing a built-in flag, duplicates, invalid
names, empty expressions, unknown identifiers, and cycles.

---

## States — modes of operation

`states.json` lists the modes the agent can be in and which one it starts in:

```json
{
  "initial": "explore",
  "states": [
    { "id": "explore", "description": "Follow the wall." },
    { "id": "seek",    "description": "Head straight for the goal." }
  ]
}
```

The agent is always in exactly one state. Rules with a matching `state` are the only
ones considered, so states let the same observation produce different behavior.
Transitions happen when a rule with a `setState` fires — that's the state machine.

---

## Functions — bricks (single- and multi-step)

`functions.json` defines reusable behaviors ("bricks") that rules call by `id`.
A brick is **either** single-step or multi-step:

```json
{
  "functions": [
    { "id": "step",        "action": "moveForward" },
    { "id": "pivot-left",  "action": "turnLeft"    },
    { "id": "pivot-right", "action": "turnRight"   },
    { "id": "hold",        "action": "wait"        },

    { "id": "about-face", "steps": ["pivot-right", "pivot-right"] },
    { "id": "dash",       "steps": ["step", "step", "step"] }
  ]
}
```

- **Single-step** — `{ "action": ... }`. One of the four primitive actions:
  `moveForward`, `turnLeft`, `turnRight`, `wait`.
- **Multi-step** — `{ "steps": [...] }`. A list of primitive actions **and/or other
  function ids** (so bricks compose from bricks). The engine expands it into a flat
  plan and runs it **one action per tick**. While a multi-step brick is running it
  is *committed*: the rules do not re-evaluate until the brick finishes. The debug
  panel shows progress as `dash (2/3)`.

A function must have exactly one of `action` or `steps`. Cycles (a brick that
eventually calls itself) are rejected at load time.

> A blocked `moveForward` (wall/edge ahead) is safe — the robot simply stays put and
> the tick still passes. So a `dash` that runs into a wall wastes moves but never
> errors.

---

## Goals & memory

`goals.json` sets priorities; the highest-priority goal whose `activeWhen` condition
holds becomes the active goal (shown in the debug panel). Goals are informational in
Milestone 1 but can gate behavior via conditions:

```json
{
  "goals": [
    { "id": "reach-goal",      "priority": 10 },
    { "id": "conserve-energy", "priority": 1, "activeWhen": "energy < 30" }
  ]
}
```

`memory.json` is just the initial memory object. It's loaded, carried on the agent,
and rendered live in the debug panel to prove the channel works.

---

## Completing a run: settle on the goal

Stepping onto the goal does **not** finish the run. The robot must stay on the goal
tile for `goalHoldTicks` consecutive ticks (default **3**) — stepping off resets the
counter. This proves a deliberate arrival rather than passing over the tile on the
way somewhere else, and it is why the `wait` primitive exists.

So every working brain needs a top-priority settle rule:

```json
{
  "id": "settle-at-goal",
  "when": "atGoal",
  "do": "hold",
  "priority": 200,
  "description": "Standing on the goal — hold until the arrival is confirmed."
}
```

Omit the `state` field so it applies in every state, and give it a high priority so
it outranks the movement rules once the robot arrives. The debug panel shows progress
as **Holding on goal — 2 / 3**. The threshold is configurable per simulation via
`new Simulation(world, brain, { goalHoldTicks: 5 })`.

## Write your first rule (walkthrough)

Goal: make the robot **turn around whenever it has already been to the tile ahead**
(a simple "don't retread" reflex).

1. Open the simulation, pick a world + brain, and open the **`functions.json`** tab.
   Confirm there's a brick that turns around — add one if needed:

   ```json
   { "id": "about-face", "steps": ["pivot-right", "pivot-right"] }
   ```

2. Switch to the **`rules.json`** tab and add a high-priority rule near the top of
   the array:

   ```json
   {
     "id": "avoid-retread",
     "state": "explore",
     "when": "visitedAhead && !goalAhead",
     "do": "about-face",
     "priority": 90
   }
   ```

3. Press **Apply & Reset**. If the JSON is malformed or you referenced a missing
   function/state, the editor shows the exact error. Fix and re-apply.

4. Press **Start** and watch the debug panel: when the robot faces a visited tile,
   "Triggered rule" reads `avoid-retread` and it runs `about-face (1/2)` then
   `(2/2)`.

That's the whole loop: edit data → Apply → the same engine executes your brain. Every
future interface (visual blocks, handwritten code, AI) is just another way to produce
these same five files.
