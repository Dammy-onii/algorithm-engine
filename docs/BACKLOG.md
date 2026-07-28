# Backlog — authoring & execution improvements

Working list agreed with the maintainer. Legend: ✅ done · 🟨 in progress · ⬜ planned.

## Decisions locked
- **`THEN` flow directive = Option B** — prototyped, then **reverted** by request.
  Sequencing stays with multi-step bricks composed in the Functions tab.
- **Active-rule highlight** — the rule firing each tick is shown in a soft (dim)
  colour during a run. ✅ shipped.
- **States rework — deferred** (explicitly excluded for now).

## Items

1. **Code-mode approachability** — ⬜ planned
   Per-world starter template pre-filled; inline reference of what you can
   **observe** (base senses + that world's `domain` facts with labels) and what you
   can **return** (base + world actions); teach "one action per tick, remember
   multi-tick behaviour in an instance field." No engine change (~250–400 lines).

2. **`THEN proceed | end` flow directive (Option B)** — ⬜ reverted
   Prototyped across engine/authoring/Studio, then reverted by request. Sequencing
   remains multi-step bricks in the Functions tab.

3. **Active-rule highlight per tick** — ✅ done
   `activeRuleId` threaded StudioPage → AuthoringPanel → RuleBuilder; firing card
   glows soft amber during a run.

4. **Rules guide copy + example** — ✅ done (reverted to brick wording)
   Describes ordered top-to-bottom flow + multi-step bricks for sequencing;
   collapsible example shows a wall-follower with composed bricks.

5. **States rework** — ⬜ deferred
   Problem: states are inert unless a real multi-state machine is built, and
   redundant with observable flags in current worlds. Proposed (later): hide until a
   challenge uses them, show live current-state during a run, one honest one-liner.
   Fork still open: (a) hide-until-needed [rec], (b) document-only, (c) cut from the
   visual layer.

6. **Branching Maze discoverability** — ✅ done (hints)
   Hints teach a consistent wall-following policy; a reusable movement brick may be
   composed in the Functions tab.

7. **Structured-execution interpreter (nodes + frame stack)** — ⬜ proposed
   Long-term model for nested `if`/`loop`, recursion, multi-agent. See
   [STRUCTURED_EXECUTION.md](./STRUCTURED_EXECUTION.md).

## Next
States rework (#5) remains deferred; the interpreter (#7) is the larger open item.
