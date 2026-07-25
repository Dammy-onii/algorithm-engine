# Change Log — Current Product Behaviour

This is the concise, current record of user-facing and engine changes. It is
updated with each implemented feature. For detailed contracts, use
[ARCHITECTURE.md](./ARCHITECTURE.md), [RULES.md](./RULES.md), and the relevant
world document.

## 2026-07-25 — Ordered decision flow and Code mode

### Implemented

- **Rules execute in authored top-to-bottom order.** The first rule whose `WHEN`
  condition is true and whose next action is safe runs. Numeric rule `priority`
  values are retained only so old saved JSON continues to load; they no longer
  affect execution.
- **Studio exposes order as `#1`, `#2`, …** Dragging and the move controls change
  that order. Rule folders only organise cards; collapsing or moving a card into
  a folder never changes execution.
- **Action safety is checked before every primitive.** A blocked `moveForward`
  is not executed. A multi-step brick whose later action becomes unsafe is
  interrupted and the decision flow resumes.
- **Code mode is available in Studio.** A locally authored JavaScript controller
  class returns one primitive action from `decide(observation)` each tick. Its
  instance fields persist between ticks; the engine still validates actions and
  owns the world, trace, objectives, and clock.
  A non-empty Code editor selects this mode on Apply & Run; clearing it restores
  visual-rule execution.

### Verified

- The ordered right-wall-flow test solves the Branching Maze within 80 ticks.
- The Code-mode `RightHandFollower` test solves the same maze within 80 ticks.
- An unsafe controller action becomes `wait`.
- TypeScript, the full Vitest suite, lint (one pre-existing warning), and the
  production build pass.

### Important limits

- Code mode is a **local Studio authoring surface**, not an isolation boundary.
  A hosted interview or competition runner must execute the same controller
  contract inside an isolated worker/container with time and memory limits.
- A controller is called once per tick. It may inspect many facts in one
  observation, but the world applies exactly one action per tick. This preserves
  deterministic replay and avoids conflicting simultaneous mutations.

## 2026-07-25 — Finance operational flow visualisation

- Added a non-grid Finance transfer-flow view above the processing card.
- It visualises the incoming transaction queue, AI routing step, and live provider
  lanes.
- The latest selected provider lane is highlighted so each route decision is
  visible in the operational flow.
- Removed the renderer's calculated “best value” label; it now shows provider
  facts only.

## 2026-07-25 — Finance: remove answer-revealing conditions

Removed the comparative Finance conditions `cheapest*`, `mostReliable*`, and
`bestValue*` from the world vocabulary and all Finance challenge palettes. They
were redundant because provider cards already show the facts used to make those
decisions.

Finance brains now use either a direct preferred-provider/failover policy
(`onlineA → route A`, then `onlineB → route B`) for fixed scenarios, or raw
comparisons over displayed facts such as `feeX` and `expectedCostX`. No new routing
mechanics or scoring model were added.
