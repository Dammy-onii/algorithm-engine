# Milestone 4 — Learning & Progression

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
| Conditions & priority | First Corner | Instructions |
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

[ChallengeSelector.tsx](../app/components/studio/ChallengeSelector.tsx) is now a
progression path: each card shows its step number, the concept it teaches (`Learn:
Priority`), and its state — ✓ completed, available, or 🔒 locked.

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

## Still to build (M4, future passes)

- **Skill-tree visualization** with prerequisite edges (the registry already supports
  a graph; the current map renders it as a linear path).
- **Per-concept mastery detail** using *bonus* objective results (efficiency, economy),
  not just completion — the metrics substrate from M3 already carries this.
- **Adaptive difficulty** — surface an optional harder variant once a concept is
  mastered, feeding the "robustness" quality metric.

## Verification

`npm run build`, `npm run lint`, `npm test` (**48 tests**, +6 curriculum) all pass.
Browser: locked challenges are dimmed/unselectable; completing one unlocks the next and
shows the "You just learned" callout; staged hints reveal in order. See
[PROGRESS_M4.md](./PROGRESS_M4.md).
