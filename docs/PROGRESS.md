# Build Progress — Milestone 1

Live, resumable tracker for the Milestone 1 build. If work is interrupted, this file
plus the in-session task list is enough to pick up exactly where things stopped.

**Status legend:** ⬜ not started · 🟨 in progress · ✅ done · ⛔ blocked

_Last updated: 2026-07-23 — **Milestone 1 complete**. Build passes, 6/6 tests pass,
simulation solves both mazes live in the browser._

## Task board

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Engine types (`lib/engine/types.ts`) | ✅ | Action, Direction, Tile, Observation, World/Agent/Brain shapes |
| 2 | Grid + World (`lib/engine/world/grid.ts`, `lib/engine/world/world.ts`) | ✅ | Load grid, walls, apply actions, bounds/collision, energy |
| 3 | World data files (`content/worlds/maze.json`, `content/worlds/entities.json`) | ✅ | Two mazes: `maze.json`, `maze-rooms.json` |
| 4 | Brain data files (`content/brains/*/*.json`) | ✅ | Default and naive reference brains |
| 5 | Runtime loader (`lib/engine/runtime/loader.ts`) | ✅ | Validates world + brain, fails loudly |
| 6 | Observation system (`lib/engine/decision/observation.ts`) | ✅ | Walls, neighbors, line-of-sight goal visibility |
| 7 | Decision layers (goal/state/rule/function/action) | ✅ | + `condition.ts` expression evaluator |
| 8 | Simulation (`simulation.ts`) | ✅ | `tick()`, snapshot trace, stuck/energy detection |
| 9 | Renderer component | ✅ | `features/simulation/components/MazeRenderer.tsx` |
| 10 | Debug panel component | ✅ | `features/simulation/components/DebugPanel.tsx` |
| 11 | Controls + page wiring (`app/page.tsx`) | ✅ | Start/pause/step/reset/speed + world/brain pickers + rules editor |
| 12 | Verify success criteria + swap-file test | ✅ | `npm run build`, `npm test` (6/6), live browser run reached goal |

## Verification evidence

- `npm run build` — ✅ compiles, type-checks, static-generates.
- `npm test` (vitest) — ✅ 6/6: wall-follower reaches goal in **both** mazes with no
  code change; naive brain does **not** reach goal (proves brains are data-driven);
  full decision trace emitted each tick; condition evaluator unit-tested.
- Live browser run — ✅ robot traversed the snake corridor, state machine
  transitioned `explore → seek`, status reached goal at tick 54.

## Decisions log

- **Engine location:** `lib/engine/` (framework-agnostic; imported via `@/lib/...`).
- **Maze format:** 2D array of tile codes (0 empty, 1 wall, 2 start, 3 goal) with
  explicit `start`/`goal` coords.
- **Rule conditions:** human-writable boolean expressions (`condition.ts`) — a safe,
  no-`eval` mini-language (`&&`, `||`, `!`, comparisons, observation flags). This
  directly serves the "users write/edit their rule set and the engine executes it"
  goal for hackathons/interviews/competitions/play.
- **Movement model:** facing direction + `moveForward`/`turnLeft`/`turnRight`/`wait`.
- **Energy:** included, decremented per action, ends run at 0 (non-fatal display + stat).
- **Goal visibility:** straight cardinal line-of-sight down a clear corridor.
- **Stuck detection:** `stuckAfterIdleTicks` (40) + `maxTicks` hard cap (2000).
- **Loop timing:** `setInterval` at a speed slider (default 6 ticks/s).
- **Samples shipped:** 2 worlds + 2 brains to prove file-swapping.
- **Tests:** vitest added (`npm test`).

## Post-milestone extensions (requested)

- **Multi-step bricks** — functions can be `{ steps: [...] }` (actions and/or other
  function ids), compiled to flat action plans (cycle-checked) and run one action per
  tick as a committed behavior. Shipped `dash` + `about-face` bricks and a third
  "Dash Explorer" brain. Debug panel shows `dash (2/3)`. Covered by tests (8/8).
- **Full five-layer brain editor** — the in-app editor now edits **all five layers**
  (goals/states/rules/functions/memory), not just rules. Apply & Reset re-parses every
  layer, rebuilds the whole brain, and surfaces per-layer parse **and** loader
  validation errors. See [`features/lab/components/BrainEditor.tsx`](../features/lab/components/BrainEditor.tsx).
- **Authoring guide** — [`RULES.md`](./RULES.md): fields, condition grammar, bricks,
  and a write-your-first-rule walkthrough.

## How to resume

1. Read this file's task board for the last ✅ / 🟨.
2. Check the in-session task list (TaskList) for finer-grained state.
3. Continue from the first ⬜ / 🟨 task.
4. Update this file's status column and timestamp as tasks complete.

## Run it

```bash
npm run dev   # open http://localhost:3000, press Start
npm test      # engine unit + integration tests
npm run build # production build + type check
```

## Next up (Milestone 2 seeds)

Milestone 1 is done. The natural next step (Milestone 2) is a visual/block editor
that **generates** these same `content/brains/*/*.json` files — the engine stays unchanged.
The in-app rules editor is a first primitive step toward that.
