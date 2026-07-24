# Milestone 2 — Task Tracker

> Updated live throughout the build. If this session stops, start from the first `[ ]` item.

## Phase 1 — Foundation (lib/authoring/)
- [x] `lib/authoring/types.ts` — VisualBrain model: goals, states, rules, functions, memory + condition types
- [x] `lib/authoring/brainCompiler.ts` — VisualBrain → BrainSource (feeds existing engine unchanged)
- [x] `lib/authoring/brainDecompiler.ts` — BrainSource → VisualBrain (for loading existing brains into editor)
- [x] `lib/authoring/brainSummarizer.ts` — VisualBrain → human-readable intelligence explanation

## Phase 2 — Challenge Data
- [x] `world/challenge-straight.json` — 7×3 straight corridor
- [x] `world/challenge-corner.json` — 5×5 L-shape corner
- [x] `world/challenge-arena.json` — 9×9 open arena
- [x] `challenges/01-straight-line.json` — narrative + scaffold brain
- [x] `challenges/02-one-corner.json`
- [x] `challenges/03-dead-end.json`
- [x] `challenges/04-snake-corridor.json`
- [x] `challenges/05-open-arena.json`
- [x] `challenges/index.ts` — registry + typed helpers
- [x] `app/lib/datasets.ts` — add 3 new worlds

## Phase 3 — Studio UI Components
- [x] `app/components/studio/blocks/PrimitiveBlock.tsx`
- [x] `app/components/studio/blocks/ConditionChip.tsx`
- [x] `app/components/studio/layers/GoalEditor.tsx`
- [x] `app/components/studio/layers/StateEditor.tsx`
- [x] `app/components/studio/layers/RuleBuilder.tsx`
- [x] `app/components/studio/layers/FunctionComposer.tsx`
- [x] `app/components/studio/layers/MemoryEditor.tsx`
- [x] `app/components/studio/BrainIntelligence.tsx`
- [x] `app/components/studio/AuthoringPanel.tsx`
- [x] `app/components/studio/ChallengeSelector.tsx`

## Phase 4 — Page Rewrite
- [x] `app/page.tsx` — two-tab (Studio | Lab), challenge state, visual brain state, shared engine

## Phase 5 — Docs
- [x] `docs/MILESTONE2.md` — design doc
- [x] `docs/PROGRESS_M2.md` — live build tracker
- [x] `docs/MILESTONES.md` — update M2 status to "In progress"

## Phase 6 — Tests & Verification
- [x] `lib/authoring/__tests__/authoring.test.ts` — condition compilation, compile/decompile round-trips, all 5 challenge scaffolds build + tick + validate, authored brain solves the snake maze, summarizer
- [x] `vitest.config.ts` — `@/*` alias so tests resolve engine imports
- [x] `npm run build` passes
- [x] `npm test` all green (23/23 — 8 engine + 15 authoring)
- [x] Manual: Challenge 1 works end-to-end (verified in browser, reached goal tick 4)
- [x] Manual: Challenges 2–5 load, preview, no console errors
- [ ] Manual: Challenge 4 (Snake) solved with a user-composed function (UI walkthrough)
- [ ] Manual: "Show Brain JSON" matches engine format

## Phase 7 — Review pass (fixes + design)
- [x] Fix localStorage hydration runtime bug (SSR-safe init + post-mount load)
- [x] Remove decorative emojis (keep functional arrows/labels + ✓ ● ○)
- [x] Monochrome palette across Studio + Lab (weight/fill, not hue)
- [x] Studio hierarchy overhaul (editor primary; Current Intelligence demoted)
- [x] Grayscale maze renderer + monochrome debug panel
- [x] Verify build + lint + tests + live Studio/Lab walkthrough

## Phase 8 — Layer clarity + stage preview
- [x] Paused stage preview (tick 0) before Apply & Run — shows world, robot start + facing
- [x] States tab: "what a state is" explainer, per-state usage (which rules run in / enter it), rename repoints initial, single-state note
- [x] Goals tab: explainer + honest note that goals are observability-only today
- [x] Memory tab: explainer + honest note that memory is carried/displayed only
- [ ] Decide: make goals functional (gate rules) or keep as observability — see open questions
- [ ] Decide: show locked Functions tab on levels 1–3 instead of hiding it

## Phase 9 — Editor bug fixes + settle-on-goal win condition
- [x] Fix focus loss while typing in Rules/Goals/Memory (React key was the editable
      id, so every keystroke remounted the input). Cards now key on a stable index
      and update by index.
- [x] Fix "?" placeholders in composed function sequences — sequences store brick
      ids (`step`) while the palette renders action types (`moveForward`);
      `PrimitiveBlock` now resolves brick ids and renders user functions as named chips.
- [x] Rules tab: "How a rule works" explainer (WHEN = what the robot senses,
      DO = the action, priority breaks ties) + tooltips on WHEN/DO.
- [x] States tab: rewritten explanation with a concrete two-mode example.
- [x] **Win condition: settle on the goal.** `World.ticksAtGoal` + configurable
      `goalHoldTicks` (default 3). Stepping onto the goal no longer completes a run —
      the agent must remain there for 3 consecutive ticks; stepping off resets.
      `SimStep.goalHold` reports progress; debug panel shows "Holding on goal 2 / 3".
- [x] All 5 challenges: `hold` brick + `atGoal` condition exposed, scaffold defines
      `hold`, objectives/explanations updated.
- [x] Sample brains (`brain/`, `brain-dash/`) given a top-priority `atGoal → hold` rule.
- [x] Tests: 25/25 — including "reaching the goal is not enough" and configurable
      `goalHoldTicks`.
- [x] Verified in browser: Challenge 1 solved with a 2-rule brain, "Holding on goal 3 / 3".

## Phase 10 — Milestone 3: Intelligence Composition
Detailed tracker in [PROGRESS_M3.md](./PROGRESS_M3.md); design in [MILESTONE3.md](./MILESTONE3.md).
- [x] Derived conditions engine (Resolver, recursion, cycle detection, load-time validation)
- [x] Conditions layer wired through types / loader / rule + goal + action resolvers / Simulation
- [x] Authoring: `VisualDerivedCondition`, compiler + decompiler
- [x] Conditions tab: engine-flag reference (per-challenge availability) + derived composer
- [x] Derived conditions selectable in the Rule builder's WHEN
- [x] Objectives: `RunMetrics`, evaluator, `challengePassed`; added to all 5 challenges
- [x] Objectives tab (read-only checklist, ticks after each run); completion uses `challengePassed`
- [x] States gated with `statesUnlocked` (read-only 1–4, editable at Challenge 5)
- [x] **Fixed:** double-click "+ Add rule" (functional updater end-to-end)
- [x] **Fixed:** forward-compatible brain load (`normalizeBrain`) so pre-M3 saves don't crash
- [x] Tests: derived-conditions + objectives suites (42 tests total)
- [x] Docs: ROADMAP (all 8 milestones), MILESTONE3, PROGRESS_M3, MILESTONES/RULES updates
- [ ] Personal intelligence library (persist + import named assets across challenges)
- [ ] Library management UI
