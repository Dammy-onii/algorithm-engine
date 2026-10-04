# Simple Decisions — The Sorting Desk

Simple Decisions is the beginner pack and the first world in the catalogue. Items
arrive one at a time, and the learner's rules send each one to one of two
blocks. There is no movement, timing, or resource pressure. Each level is one
fact mapped to one choice, so a first-time user can learn what a rule is, how
rule order works, and how a fallback works before meeting a harder world.

> The learner is not doing the maths. The desk works out each item's facts
> (even, prime, fragile); the learner decides what to do with them.

---

## How it maps onto the engine

The engine loop is unchanged: **Observe → Decide → Act → Update → Render**.

| Engine concept | Sorting desk meaning |
|---|---|
| One **tick** | One item sorted (or one wait, if no rule wins). |
| **Observation** | Facts about the item at the sorting point, plus sorting progress. |
| **Action** | `sendToA` or `sendToB` (the two blocks). `wait` is the base primitive. |
| **Completion** (`resolveStatus`) | `reached` when the conveyor is empty; `stuck` at the safety cap. |
| **Grading** (objectives) | `allSorted`, `mistakes`, and the authored rule count. |

A run that sorts everything with mistakes still ends `reached`; the objectives
(`allSorted && mistakes == 0`) decide whether the level passes. This matches the
Finance convention that termination is not the same as success.

### No grid

Like Finance and Parking, the world carries a placeholder 1×1 grid to satisfy
the shared `WorldData` contract and sets `tracksMovement: false`, so the
generic "no new tile ⇒ stuck" heuristic never fires. The module ends a run that
never sorts after `items × 5 + 20` ticks.

---

## The module — `lib/engine/worlds/sorter.ts`

The module is scenario-agnostic. A world supplies its items, the two block
labels, and `binARule`: a condition expression over the item's facts that says
which items belong in block A. Every other item belongs in block B.

```json
"sorter": {
  "binA": { "label": "Prime Block" },
  "binB": { "label": "Non-Prime Block" },
  "binARule": "isPrime",
  "items": [{ "id": "n1", "label": "2", "number": 2 }, …]
}
```

`binARule` is evaluated with the engine's own safe condition evaluator, and the
loader rejects a rule that does not parse. A new scenario is therefore a content
change only, as long as it uses facts the module already publishes.

### Facts (`observation.domain`)

The condition grammar has no arithmetic, so number properties are computed by
the module and published as yes/no facts.

| Fact | Type | Meaning |
|---|---|---|
| `hasItem` | bool | An item is waiting at the sorting point. |
| `number` | number | The number on the current item (0 when it has none). |
| `isEven` / `isOdd` | bool | Parity of the current number. |
| `isPrime` | bool | Greater than 1 and divisible only by 1 and itself. |
| `isFragile` | bool | The current parcel is marked fragile. |
| `sortedCount`, `correct`, `mistakes` | number | Progress so far. |
| `remaining`, `totalItems` | number | Items still waiting, and all items. |
| `allSorted` | bool | The conveyor is empty. |

Adding a new kind of item fact (for example `isHeavy`) means adding it to
`itemFacts` and `SORTER_FLAGS` once; every scenario can then use it.

### Actions

`sendToA` and `sendToB` move the current item into a block. Both have the
precondition `hasItem`, so a rule that fires on an empty conveyor is skipped and
the next rule is tried.

### Renderer — `SorterRenderer.tsx`

A sorting point shows the current item, with the waiting items scattered beside
it (each card has a fixed tilt, so the pile does not jitter between ticks).
Below it, the two blocks fill up as items are sorted. Every sorted item gets a
green ✓ or a red ✗, so a learner can see exactly which case their rules got
wrong.

---

## The levels

All three levels are tutorials (`stage: "practice"`), start with no rules, and
expose only the two block functions. Level order and unlocking come from
`lib/curriculum/concepts.ts`.

| # | Level | Items | Rule fact | Concept taught |
|---|---|---|---|---|
| 28 | Even or Odd | 16 numbers, jumbled | `isEven` | Number facts (open from the start) |
| 29 | Prime or Not | 12 numbers | `isPrime` | Choosing the right fact |
| 30 | Fragile Parcels | 8 parcels | `isFragile` | If / otherwise |

- **Even or Odd** uses a shuffled order so the cards cannot be sorted by
  alternating pattern. Every number is either even or odd, so the two rules are
  order-independent.
- **Prime or Not** includes 1, 2, 9, 15 and 21. Sorting by `isOdd` puts cards in
  the wrong block, which is the lesson. The intended solution uses `isPrime` and
  an `always` fallback below it.
- **Fragile Parcels** introduces a non-number item and an `always` fallback.

### Writing rules for these levels

- The problem statement states the task as "Your task: build a rule that…". It
  never names the deciding fact or gives a rule.
- Hints escalate one at a time. Only the last hint, labelled "Answer:", gives
  the full rules.
- Objectives: `allSorted`, `allSorted && mistakes == 0`, and a bonus for using
  two rules or fewer.

---

## Tests

`lib/engine/__tests__/sorter.test.ts` covers primality, world validation, a bad
`binARule`, per-item grading, and each level both ways: the intended rules pass,
and the common wrong answers (swapped blocks, fallback above the special case,
`isOdd` for primes) fail. The catalogue-wide integrity test confirms a policy
that does nothing cannot pass any of them.
