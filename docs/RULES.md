# Authoring a Brain — Rules, States, Functions & More

This is the guide to writing an agent's **brain**: the six data layers the engine
executes. You can edit all six live in the browser (the tabbed editor under the
simulation) or on disk in `content/brains/<sample>/*.json`. The engine never changes — your brain is
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

## Code mode — an object-oriented controller

Studio's **Code** tab is an optional alternative to visual rules. It is intended
for interview and hackathon exercises where the participant should author an
algorithm as a class rather than arrange cards. A controller has one required
method, `decide(observation)`, which the simulation calls **once on every tick**.
It returns exactly one primitive action:

For the complete editor-to-runtime flow, the meaning of
`observation.domain`, the current Apply & Run versus Submit boundary, and the
multilingual runner design, see [CODE_MODE.md](./CODE_MODE.md).

Code mode becomes active on **Apply & Run** when the Code editor contains source;
clear that editor and apply again to return to the visual-rule brain. The two
decision sources never run together.

```js
class RightHandFollower {
  pendingMove = false;

  decide(observation) {
    if (observation.atGoal) return "wait";
    if (this.pendingMove) {
      this.pendingMove = false;
      return "moveForward";
    }
    if (!observation.wallRight) {
      this.pendingMove = true;
      return "turnRight";
    }
    if (!observation.wallAhead) return "moveForward";
    return "turnLeft";
  }
}

return new RightHandFollower();
```

Instance fields persist between ticks. That is how an algorithm can make a
two-tick behaviour such as “turn right, then move forward” without visual-card
ordering. The observation is fresh on every call, so the controller can react to
new walls, energy, packages, provider health, or other domain facts.

The controller never mutates the world directly. The engine validates its action,
turns an unsafe action into `wait`, updates the world once, and produces the
normal trace/objectives. Code mode currently runs locally in Studio; a hosted
multi-user interview runner must execute the same `AgentController` contract in
an isolated worker or container.

World-module facts live under `observation.domain`, and a controller returns the
module's primitive action—not its visual function wrapper ID. For example,
Finance returns `routeToA`, not `route-a`:

```js
class PaymentRouter {
  decide(observation) {
    const facts = observation.domain;
    if (!facts.hasTransaction) return "hold";

    const providers = [
      {
        action: "routeToA",
        available: facts.canRouteA,
        cost: facts.expectedCostA,
        reliability: facts.successRateA,
      },
      {
        action: "routeToB",
        available: facts.canRouteB,
        cost: facts.expectedCostB,
        reliability: facts.successRateB,
      },
      {
        action: "routeToC",
        available: facts.canRouteC,
        cost: facts.expectedCostC,
        reliability: facts.successRateC,
      },
    ].filter((provider) => provider.available);

    if (providers.length === 0) {
      return facts.deadlineRemaining > 1 ? "hold" : "decline";
    }

    providers.sort((left, right) =>
      facts.isPriority
        ? right.reliability - left.reliability
        : left.cost - right.cost
    );
    return providers[0].action;
  }
}

return new PaymentRouter();
```

The Code tab lists the exact primitive action strings available in the selected
challenge and supplies a domain-appropriate example where one exists. Code
currently affects **Apply & Run only**. Interview **Submit** sends the compiled
visual policy; arbitrary controller JavaScript remains excluded until an
isolated server worker exists.

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
| `priority` | — | **Legacy only.** Older JSON brains may retain this field, but it is ignored. Rule position is the decision order. |
| `description` | — | Free text for humans. |

**How a rule is chosen:** the engine reads matching-state rules in the exact
order they appear in `rules.json` (and the Studio card list). It fires the
**first** one whose `when` is `true` **and whose next action is currently safe**.
If none apply, the agent waits. This is an `if / else-if / else` flow, not a
numeric-priority competition.

```text
1. WHEN atGoal       → hold
2. WHEN !wallRight   → rightAndStep
3. WHEN !wallAhead   → step
4. WHEN !wallLeft    → leftAndStep
5. WHEN always       → turnAroundAndStep
```

Studio displays `#1`, `#2`, and so on beside each card. Dragging a card or using
the top/up/down/bottom controls changes only this authored order. Rule folders
never change it.

`+ Add rule` appends a new card to the bottom of the flow. It never silently
promotes a new branch above existing logic. Move the card upward only when the
new condition is intentionally more specific than an existing fallback. Editable
challenge scaffolds avoid a terminal `WHEN always → hold` card because the engine
already waits when nothing matches; such a terminal catch-all would otherwise
hide newly appended cards until the learner manually reordered them.

Scored interview challenges begin with an empty scaffold rule list. Their goals,
states, available conditions, actions, and primitive functions define the
contract, but every decision branch is authored by the candidate.

### Guarded flow — why an impossible action never runs

Order alone is not enough to produce intelligent behaviour. Consider an
unguarded top rule `WHEN always → moveForward` followed by `WHEN always →
turnRight`. In a dead end the first branch wants to move forward — but it can't.
A naive engine would keep selecting that impossible move and bash the wall
forever.

The engine separates the two questions:

> **Conditions and action guards decide what is possible. Rule order decides
> which possible response is tried first.**

Every action has a **precondition** — a condition expression over the same
observation flags:

| Action | Precondition |
|--------|--------------|
| `moveForward` | `!wallAhead` |
| `turnLeft` / `turnRight` / `wait` | always possible |
| `pickUp` | `packageHere && capacityRemaining > 0` |
| `deliver` | `deliveryHere && carryingPackage` |
| `charge` | `chargingHere` |

Base guards live in the engine; each world module may contribute its own via
`WorldModule.actionPreconditions`. When selecting a rule, the engine skips any
whose first action isn't currently possible and continues down the flow — so in
the dead-end example it turns instead of looping. If *no* matching rule's action
is possible, it waits.

This is backward-compatible with explicit guards: a rule written as
`WHEN !wallAhead → step` simply won't match when blocked, which the guard already
handled. Preconditions are the safety net that makes ordered flow robust — you can
still write guards to express *intent*, but you can no longer get stuck bashing a
wall because an earlier rule named an impossible action.

To sequence actions (e.g. "turn right, then step"), compose a **multi-step brick**
in the Functions tab and use it as a rule's DO; the engine runs its steps one per
tick before re-checking the flow. Studio highlights the rule card firing on the
current tick during a run.

### Rule folders in Studio

Studio can group cards into named **rule folders** such as “Safety”, “Navigation”,
or “Warehouse delivery”. Create, rename, or remove folders in the Rules tab, then
choose a folder on each rule card. A folder's **Collapse** control hides its
assigned cards; **Expand** makes them visible again. Removing a folder leaves its
rules intact and returns them to **Unfiled**.

Folders are editor metadata saved with the visual brain in the browser. They are
not compiled into `rules.json` and never alter a rule's condition or execution
order. Collapse is only a visibility preference: hidden cards remain in the
global list and the engine still evaluates it from top to bottom.

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
"always"                        // fires whenever reached in rule order
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

Studio's expression input uses a themed, scrollable autocomplete directly below
each field. It completes the identifier at the active caret, so suggestions keep
working after an earlier condition or operator:

```text
canRouteA && dea
             └─ selecting deadlineRemaining replaces only "dea"
```

| Operator | Meaning | Example |
|---|---|---|
| `&&` | both expressions must be true | `canRouteA && isPriority` |
| `||` | either expression may be true | `canRouteA || canRouteB` |
| `!` | invert a boolean | `!wallAhead` |
| `( )` | group expressions | `(canRouteA || canRouteB) && isPriority` |
| `< <= > >=` | numeric comparison | `deadlineRemaining <= 2` |
| `== !=` | equality or inequality | `retryCount != 0` |

The Conditions tab exposes the same reference through the collapsible
**Condition operators and examples** section.

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

In Finance, states are most useful as payment-switch operating modes:
`normal-routing`, `deadline-protection`, and `outage-recovery`. Queue depth,
provider health, retries, or the current transaction can trigger a transition,
and each mode can own a different ordered rule flow. Controller states do not
directly rewrite a payment's runtime status. The Finance world owns statuses such
as ready, processing, failed, and completed; `route`, `hold`, and `decline`
actions advance that lifecycle.

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

- **Single-step** — `{ "action": ... }`. The maze primitives are `moveForward`,
  `turnLeft`, `turnRight`, and `wait`; warehouse worlds additionally expose
  `pickUp`, `deliver`, and (where configured) `charge`. Finance, Parking, and
  future modules contribute their own single-action wrappers through the same
  contract. Studio marks every single-action wrapper as a locked engine/world
  primitive rather than a user-composed function.
- **Multi-step** — `{ "steps": [...] }`. A list of primitive actions **and/or other
  function ids** (so bricks compose from bricks). The engine expands it into a flat
  plan and runs it **one action per tick**. While a multi-step brick is running it
  is *committed*: the rules do not re-evaluate until the brick finishes. The debug
  panel shows progress as `dash (2/3)`.

A function must have exactly one of `action` or `steps`. Cycles (a brick that
eventually calls itself) are rejected at load time. A multi-step brick normally
continues across ticks, but the engine observes again before each primitive. If
the next primitive is now unsafe (for example `moveForward` now faces a wall),
the remaining plan is interrupted and the rule flow starts again that tick.

> A blocked `moveForward` (wall/edge ahead) is safe: it is never applied blindly.
> Rule selection skips an immediately blocked move, and a running multi-step brick
> is interrupted before a later blocked move. The engine then evaluates the next
> applicable rule rather than wasting the move or erroring.

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

So every working brain needs a first settle rule:

```json
{
  "id": "settle-at-goal",
  "when": "atGoal",
  "do": "hold",
  "description": "Standing on the goal — hold until the arrival is confirmed."
}
```

Put it above the movement rules and omit the `state` field so it applies in every
state once the robot arrives. The debug panel shows progress
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

2. Switch to the **`rules.json`** tab and add this rule near the top of the
   array, before general movement fallbacks:

   ```json
   {
     "id": "avoid-retread",
     "state": "explore",
     "when": "visitedAhead && !goalAhead",
    "do": "about-face"
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
