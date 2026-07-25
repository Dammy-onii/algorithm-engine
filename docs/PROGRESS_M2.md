# Build Progress — Milestone 2

Live, resumable tracker. If work is interrupted, start from the first ⬜ item.

**Status legend:** ⬜ not started · 🟨 in progress · ✅ done · ⛔ blocked

_Last updated: 2026-07-23 — Phase 1–5 complete. Build verification in progress._

---

## Task board

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | Authoring types | `lib/authoring/types.ts` | ✅ |
| 2 | Brain compiler | `lib/authoring/brainCompiler.ts` | ✅ |
| 3 | Brain decompiler | `lib/authoring/brainDecompiler.ts` | ✅ |
| 4 | Brain summarizer | `lib/authoring/brainSummarizer.ts` | ✅ |
| 5 | World: straight corridor | `content/worlds/challenge-straight.json` | ✅ |
| 6 | World: corner turn | `content/worlds/challenge-corner.json` | ✅ |
| 7 | World: open arena | `content/worlds/challenge-arena.json` | ✅ |
| 8 | Challenge 1 — Straight Run | `challenges/01-straight-line.json` | ✅ |
| 9 | Challenge 2 — First Corner | `challenges/02-one-corner.json` | ✅ |
| 10 | Challenge 3 — No Way Out | `challenges/03-dead-end.json` | ✅ |
| 11 | Challenge 4 — Build Strategy | `challenges/04-snake-corridor.json` | ✅ |
| 12 | Challenge 5 — Two Minds | `challenges/05-open-arena.json` | ✅ |
| 13 | Challenge registry | `challenges/index.ts` | ✅ |
| 14 | Dataset update (3 new worlds) | `lib/content/datasets.ts` | ✅ |
| 15 | PrimitiveBlock component | `features/studio/components/blocks/PrimitiveBlock.tsx` | ✅ |
| 16 | ConditionChip component | `features/studio/components/blocks/ConditionChip.tsx` | ✅ |
| 17 | GoalEditor layer | `features/studio/components/layers/GoalEditor.tsx` | ✅ |
| 18 | StateEditor layer | `features/studio/components/layers/StateEditor.tsx` | ✅ |
| 19 | RuleBuilder layer | `features/studio/components/layers/RuleBuilder.tsx` | ✅ |
| 20 | FunctionComposer layer | `features/studio/components/layers/FunctionComposer.tsx` | ✅ |
| 21 | MemoryEditor layer | `features/studio/components/layers/MemoryEditor.tsx` | ✅ |
| 22 | BrainIntelligence panel | `features/studio/components/BrainIntelligence.tsx` | ✅ |
| 23 | AuthoringPanel | `features/studio/components/AuthoringPanel.tsx` | ✅ |
| 24 | ChallengeSelector | `features/studio/components/ChallengeSelector.tsx` | ✅ |
| 25 | Page rewrite (Studio + Lab) | `app/page.tsx` | ✅ |
| 26 | MILESTONE2.md doc | `docs/MILESTONE2.md` | ✅ |
| 27 | MILESTONES.md update | `docs/MILESTONES.md` | ✅ |
| 28 | Authoring unit tests | `lib/engine/__tests__/authoring.test.ts` | ⬜ |
| 29 | `npm run build` verification | — | ✅ |
| 30 | Manual challenge 1 walkthrough | — | ✅ |
| 31 | Manual challenge 4 (custom fn) | — | ⬜ |

## Review pass — fixes & design (2026-07-23)

A review pass fixed a runtime bug and reworked the UI. `npm run build`, `npm run
lint`, and `npm test` (8/8) are all green; Studio + Lab verified live in the browser
with a clean console.

**Runtime fix — localStorage hydration**
- `loadOrDefaultBrain` / `ChallengeSelector` read `localStorage` during render, which
  is undefined during SSR prerender → hydration mismatch once a brain/completion was
  stored.
- Fix: `page.tsx` now initializes the editor brain from the challenge **scaffold only**
  (deterministic on server + client) and loads any persisted brain + completion set in
  a post-mount `useEffect`. `ChallengeSelector` takes `completedIds` as a prop instead
  of reading storage during render. Verified: reload with stored completion → no error.

**Design — monochrome + hierarchy (per request)**
- Removed all decorative emojis (🧪⚗️🎯💡🧠🎉🤔🤖🔒↩★). Kept functional glyphs:
  direction arrows + text labels on primitives, ✓ completion, ● / ○ initial-state.
- Monochrome (zinc) palette across Studio + Lab; emphasis via weight/fill, not hue.
  Engine primitives = filled dark chips; user functions = outlined — distinction by
  form, not color.
- Studio hierarchy: the **layer editor is now the primary surface**; "Current
  Intelligence" demoted from a loud amber block to a quiet neutral panel; challenge
  objective is a bordered label, not a green box; challenge cards + level badges
  neutralized. Maze renders grayscale (goal = ringed tile + dot, robot = dark arrow).

**Still open:** authoring unit tests (#28) and manual challenge 4 custom-function
walkthrough (#31).

---

## How to resume

1. Find the first ⬜ task above.
2. See the file path in the **File(s)** column — that is where the code goes.
3. Read `MILESTONE2.md` for the architecture and data flow.
4. Read `lib/authoring/types.ts` for the `VisualBrain` and `ChallengeData` types.
5. Continue from that task.

## Decisions log

- **Combined page (not a separate route):** Studio and Lab live on `/` as tabs. Routing may change in a later milestone.
- **localStorage persistence:** Challenge brains are saved per `challengeStorageKey(id)`. No backend required for M2.
- **No new npm packages:** Drag-and-drop implemented with click-to-append (function composer) to avoid dependency churn.
- **Condition model:** Guided mode (chips) for simple flat AND/OR chains; automatic fallback to raw mode for complex expressions.
- **Engine primitives:** Locked in the UI (indigo, cannot edit). User functions are emerald.
- **Completion tracking:** `ae-complete-{id}` localStorage key set when `sim.status === "reached"`.

## Run it

```bash
npm run dev   # open http://localhost:3000 — Studio tab is the default
npm test      # unit + integration tests
npm run build # type check + static build
```
