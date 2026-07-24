# Build Progress — Milestone 3 (Intelligence Composition)

Resumable tracker. Legend: ⬜ not started · 🟨 in progress · ✅ done

_Last updated: 2026-07-24 — composition core shipped; personal library pending._

## Task board

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | Engine: derived-condition evaluator (Resolver, memo, cycles) | `lib/engine/decision/condition.ts` | ✅ |
| 2 | Engine: static helpers (`referencedIdentifiers`, `assertParsable`, `BUILTIN_FLAGS`) | `condition.ts` | ✅ |
| 3 | Types: `DerivedCondition`, `ConditionsData`, `Brain.derivedConditions` | `lib/engine/types.ts` | ✅ |
| 4 | Loader: `compileDerivedConditions` + expression validation on rules/goals | `runtime/loader.ts` | ✅ |
| 5 | Thread derived map through rule/goal/action resolvers | `decision/*` | ✅ |
| 6 | `BrainSource.conditions` + Simulation wiring | `simulation.ts` | ✅ |
| 7 | Authoring: `VisualDerivedCondition`, compiler/decompiler | `lib/authoring/*` | ✅ |
| 8 | UI: Conditions tab (flag reference + composer) | `ConditionEditor.tsx` | ✅ |
| 9 | Rule builder: derived conditions selectable in WHEN | `AuthoringPanel.tsx` | ✅ |
| 10 | Objectives: `RunMetrics`, evaluator, `challengePassed` | `lib/authoring/objectives.ts` | ✅ |
| 11 | Objectives added to all 5 challenges | `challenges/*.json` | ✅ |
| 12 | Objectives UI (read-only checklist, ticks after run) | `ObjectivesPanel.tsx` | ✅ |
| 13 | Completion uses `challengePassed`, results wired through page | `app/page.tsx` | ✅ |
| 14 | States lock (`statesUnlocked`; editable at Challenge 5) | `StateEditor.tsx`, `challenges/05` | ✅ |
| 15 | Fix double-click "Add rule" (functional updater) | `RuleBuilder.tsx`, `page.tsx` | ✅ |
| 16 | Forward-compatible brain load (`normalizeBrain`) | `app/page.tsx` | ✅ |
| 17 | Tests: derived conditions | `lib/engine/__tests__/derived-conditions.test.ts` | ✅ |
| 18 | Tests: objectives | `lib/authoring/__tests__/objectives.test.ts` | ✅ |
| 19 | Docs: ROADMAP, MILESTONE3, updates | `docs/*` | ✅ |
| 20 | **Personal intelligence library** (persist + import assets) | TBD | ⬜ |
| 21 | Library management UI | TBD | ⬜ |

## Verification

- `npm run build` ✅ · `npm run lint` ✅ · `npm test` ✅ **42 tests**
- Browser: Conditions tab (flag reference + composer) renders; derived-condition brain
  solves the maze; objectives tick after a run (primary + bonus); persisted pre-M3
  brains load without error.

## Decisions log

- **Derived conditions add vocabulary, not perception.** They recombine existing flags;
  new senses require engine work (M6). This keeps the engine boundary explicit.
- **Objectives reuse the condition language** — the `check` expression is evaluated by
  the same safe evaluator, so there is one expression grammar across the platform.
- **States gated, not removed** — `statesUnlocked` mirrors `functionsUnlocked`.
- **Metrics live in the authoring layer** (`objectives.ts`), not the engine — the
  engine stays a pure executor; scoring is a consumer of its output.

## Next up

The **personal intelligence library** (#20–21) is the remaining half of M3: functions
and derived conditions saved as player-owned, versioned, importable assets. See
[ROADMAP.md](./ROADMAP.md) → *Player & Intelligence Library*.
