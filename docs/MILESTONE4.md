# Milestone 4 — Learning & Progression

> **Historical milestone record.** Current rule semantics use authored order, not
> numeric rule priority. See [CHANGELOG.md](./CHANGELOG.md) for the active product
> state and [RULES.md](./RULES.md) for the authoring contract.

## What this milestone proves

Milestones 1–3 built the engine, the authoring system, and composition. **Milestone 4
proves the platform can *teach*** — a person who has never programmed can work through
the challenges and naturally arrive at writing sophisticated algorithms.

No new engine features. This milestone builds the *educational journey* on top of what
already exists: the progression itself becomes part of the product.

---

## Delivered (this pass)

### 1. Curriculum registry

[lib/curriculum/concepts.ts](../lib/curriculum/concepts.ts) — the single source of
truth for what each challenge teaches and what must come before it. Each challenge
introduces exactly **one** new concept, in order:

| Concept | Taught by | Prerequisite |
|---------|-----------|--------------|
| Instructions (one rule) | Straight Run | — |
| Conditions & ordered rules | First Corner | Instructions |
| Compound conditions | No Way Out | Conditions |
| Reusable functions | Build Your Own Strategy | Compound conditions |
| State machines | Two Minds | Reusable functions |

Pure data + helpers (`conceptForChallenge`, `isChallengeUnlocked`,
`masteredConcepts`) — framework-agnostic, unit-tested.

### 2. Progression gating

A challenge unlocks only when the concept(s) it depends on have been learned (i.e. the
teaching challenge completed). The first challenge is always open. Locked challenges
are **visible but dimmed** and cannot be selected — the learner sees where they are
heading without being able to skip ahead.

### 3. Curriculum map

[ChallengeSelector.tsx](../features/studio/components/ChallengeSelector.tsx) is now a
progression path: each card shows its step number, the concept it teaches (`Learn:
Ordered rules`), and its state — ✓ completed, available, or 🔒 locked.

### 4. "You just learned X" moments

The first time a challenge is completed, a callout names the concept just mastered and
restates it in one line — tying the abstract idea to what the robot just did.

### 5. Escalating hints

Hints are staged: a challenge may provide several (`hints: string[]`), revealed one at
a time and escalating toward the answer (nudge → worked example → the rule itself).
After two failed runs the UI nudges toward them ("Stuck? Show a hint"). Falls back to
the single `hint`. Challenges 1 and 4 ship staged hints; the rest use their single hint.

---

## Design notes

- **Concepts, not levels.** The map is a dependency chain of ideas. The "difficulty"
  label is secondary to *which concept a challenge unlocks*.
- **Motivate by breaking the previous solution.** Each challenge is one the learner's
  current toolkit cannot solve, which is what makes the new concept feel necessary
  rather than arbitrary. (Enforced by per-challenge vocab gating from M2/M3.)
- **Mastery is derived, not stored separately** — it comes from which challenges are
  completed (localStorage `ae-complete-*`), so there is one source of truth.

---

## Learner flow & readability pass (2026-07-25)

The problem statement used to render as one wall of text (narrative + objective +
intelligence notes + learning objective + hints, all at once) and the only
feedback was a terse pass/fail after a run. This pass makes the *flow* legible —
and, critically, does so through a **structured, world-agnostic schema** so every
simulation type (maze, warehouse, and the upcoming finance world) renders the
same experience. See [CHALLENGE_SCHEMA.md](./CHALLENGE_SCHEMA.md) for the schema.

Shipped:

1. **Progressive-disclosure problem brief** —
   [ProblemBrief.tsx](../features/studio/components/ProblemBrief.tsx). A one-line
   headline (*what to do*) + one line of context are always visible; the
   narrative and intelligence notes are tucked behind **Learn more**; hints live
   in their own drawer and still escalate one at a time (nudged open after two
   failed runs).
2. **Live task checklist** —
   [TaskChecklist.tsx](../features/studio/components/TaskChecklist.tsx) +
   `evaluateSteps` / `liveContext` in
   [objectives.ts](../lib/authoring/objectives.ts). A challenge's `steps` (or, as
   a fallback, its required objectives) tick off **during the run**, evaluated
   each tick against the live metrics + the current observation domain. Turns an
   abstract objective into visible incremental progress.
3. **Results screen** —
   [ResultsPanel.tsx](../features/studio/components/ResultsPanel.tsx). Replaces the
   "Goal reached" note with pass/fail, every objective (required ✓ + bonus ★), and
   an explicit **Next level →** action that navigates to the next unlocked
   challenge.
4. **Compact progress stepper** —
   [ProgressStepper.tsx](../features/studio/components/ProgressStepper.tsx). Always-on
   "Level X of N · done" summary with a dotted done/current/locked track.
5. **First-run onboarding** — a dismissible one-time banner (`ae-onboarded`)
   explaining the three regions.
6. **"Current intelligence" collapsed** — moved below the editor into a
   collapsible so it no longer competes with the task for attention.
7. **Grade taxonomy** — `taxonomyFor` in
   [challengeBrief.ts](../lib/authoring/challengeBrief.ts) places a challenge as
   **Domain → Simulation → Tier → Grade** (badge e.g. `Tutorial · Grade 1`),
   replacing the lone "Level N" everywhere (brief + selector). Difficulty for a
   simulation platform is not one axis; this is the shared vocabulary finance's
   Grade 1/5/… levels will use.

New pure modules are unit-tested
([challengeBrief.test.ts](../lib/authoring/__tests__/challengeBrief.test.ts)):
normalization fallbacks, structured-field precedence, taxonomy inference, and
live step evaluation (including safe handling of malformed checks).

## Still to build (M4, future passes)

- **Skill-tree visualization** with prerequisite edges (the registry already supports
  a graph; the current map renders it as a linear path).
- **Per-concept mastery detail** using *bonus* objective results (efficiency, economy),
  not just completion — the metrics substrate from M3 already carries this.
- **Adaptive difficulty** — surface an optional harder variant once a concept is
  mastered, feeding the "robustness" quality metric.

## Verification

`npm run build`, `npm run lint`, `npm test` (**70 tests**, +8 for the brief/flow
pass) all pass. Browser: the brief shows a one-line headline with Learn more /
Show a hint; the task checklist and progress stepper render; badges read
`Tutorial · Grade 1` etc.; locked challenges are dimmed/unselectable. See
[PROGRESS_M4.md](./PROGRESS_M4.md).
