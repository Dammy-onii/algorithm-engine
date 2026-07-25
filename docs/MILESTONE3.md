# Milestone 3 — Intelligence Composition

## What this milestone proves

Milestone 1 proved the engine executes intelligence. Milestone 2 proved users can
author it. **Milestone 3 proves users can build their own abstractions** — so the
platform feels like programming, not rule configuration.

The organizing insight: the platform let users compose **actions** (multi-step bricks)
but not **perception** (conditions were only ever consumed). M3 closes that asymmetry
and turns the authoring layer into a place where reusable assets are created.

---

## Delivered

### 1. Derived conditions (composable perception)

A sixth brain layer: user-named expressions over existing observation flags.

```json
{ "conditions": [
  { "id": "deadEnd", "expr": "wallAhead && wallLeft && wallRight" },
  { "id": "trapped", "expr": "deadEnd && energy < 10" }
] }
```

- **New knowledge, not new senses.** A derived condition can only recombine what the
  engine already perceives — the perceptual mirror of how a multi-step brick
  recombines primitive actions. You cannot author `enemyNearby` if nothing senses an
  enemy; that is engine work (M6).
- **Recursive** — conditions may reference other conditions.
- **Safe** — evaluated by the same no-`eval` expression evaluator, extended with a
  `Resolver` that resolves built-in flags first, then derived ids, with per-evaluation
  memoisation and cycle guarding.
- **Validated at load time** — shadowing a built-in, duplicates, invalid names, empty
  expressions, unknown identifiers and cycles all fail on **Apply**, never mid-run.
  Rule and goal `when`/`activeWhen` expressions are checked the same way.

Files: [condition.ts](../lib/engine/decision/condition.ts) (`Resolver`,
`referencedIdentifiers`, `assertParsable`, `BUILTIN_FLAGS`),
[loader.ts](../lib/engine/runtime/loader.ts) (`compileDerivedConditions` + expression
validation in `buildBrain`), threaded through `ruleEngine`, `goalManager`,
`actionResolver`.

### 2. Conditions tab

[ConditionEditor.tsx](../features/studio/components/layers/ConditionEditor.tsx):

- **Engine flags · locked** — a read-only reference table of every flag, its type and
  meaning, marking which are available in the current challenge.
- **Your conditions** — a composer to define, name, describe, edit and remove derived
  conditions. They immediately become selectable in the Rule builder's WHEN chips.

### 3. Objectives (quality scoring)

Challenges define machine-checkable objectives; a run is graded against `RunMetrics`.

```json
{ "objectives": [
  { "id": "reach", "label": "Reach the exit and settle on it", "check": "reached" },
  { "id": "tidy",  "label": "Solve it with 2 rules or fewer",  "check": "reached && rules <= 2", "bonus": true }
] }
```

- A **primary** objective must pass to complete a challenge; **bonus** objectives grade
  quality (fewer rules, fewer ticks, energy saved).
- Metrics available to `check`: `reached`, `stuck`, `outOfEnergy`, `ticks`, `visited`,
  `energy`, `revisits`, `rules`, `functions`, `states`, `conditions`.
- Evaluated with the engine's own safe evaluator, so the objective language is exactly
  the condition language.
- The **Objectives** tab (formerly Goals) is a read-only checklist that ticks off after
  each run. Completion now requires `challengePassed`, not merely reaching the goal.

Files: [objectives.ts](../lib/authoring/objectives.ts),
[ObjectivesPanel.tsx](../features/studio/components/layers/ObjectivesPanel.tsx).

### 4. States, honestly scoped

A state is organizational — it partitions the rule set — and only becomes meaningful
once a challenge needs two modes. So states are **read-only** on Challenges 1–4 (shown
with explanations) and **editable** on Challenge 5, gated by `statesUnlocked`. This
removes the "add a state, nothing happens" dead end without deleting the capability.

### 5. Fixes shipped alongside

- **Double-click "Add rule"** no longer drops one — appends use a functional updater
  end-to-end (`onBrainChange` accepts an updater; `RuleBuilder.add` passes one).
- **Forward-compatible saves** — brains persisted before the `derived` layer existed
  are normalized on load (`normalizeBrain`), so old localStorage never crashes the
  editor.

---

## Data flow (updated)

```
Challenge JSON (scaffold, +objectives) → decompileBrain → VisualBrain (6 layers)
                                                              ↓ user edits
                                                          VisualBrain
                                                              ↓ compileBrain
                                                          BrainSource (+conditions)
                                                              ↓ new Simulation()
                                                          run → RunMetrics
                                                              ↓ evaluateObjectives
                                                          Objective checklist ticks
```

---

## Still to build in M3

- **Personal intelligence library** — persist named functions and derived conditions
  as player-owned assets, importable across challenges, versioned. This is the "build
  your own toolkit" half of the milestone (see [ROADMAP.md](./ROADMAP.md) → *Player &
  Intelligence Library*).
- **Library UI** — browse / rename / version / delete owned assets, and an import
  picker inside the Functions and Conditions tabs.

## Verification

`npm run build`, `npm run lint`, and `npm test` (**42 tests**) all pass. Live in the
browser: Conditions tab renders the flag reference + composer; a derived-condition
brain solves the maze; objectives tick after a run; states are read-only on early
challenges. See [PROGRESS_M3.md](./PROGRESS_M3.md).
