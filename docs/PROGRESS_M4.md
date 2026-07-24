# Build Progress — Milestone 4 (Learning & Progression)

Resumable tracker. Legend: ⬜ not started · 🟨 in progress · ✅ done

_Last updated: 2026-07-24 — progression core + light mode + defaults-in-tabs shipped._

## Task board

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | Curriculum registry (concepts, prerequisites, helpers) | `lib/curriculum/concepts.ts` | ✅ |
| 2 | Progression gating (linear unlock by completion) | `concepts.ts` + `ChallengeSelector.tsx` | ✅ |
| 3 | Curriculum map UI (step, concept, locked/available/done) | `ChallengeSelector.tsx` | ✅ |
| 4 | "You just learned X" callout on first completion | `app/page.tsx` | ✅ |
| 5 | Escalating staged hints (attempts-driven nudge) | `AuthoringPanel.tsx`, `challenges/*` | ✅ |
| 6 | Curriculum tests | `lib/curriculum/__tests__/concepts.test.ts` | ✅ |
| 7 | Docs (MILESTONE4, PROGRESS_M4, roadmap status) | `docs/*` | ✅ |
| 8 | Skill-tree visualization with prerequisite edges | TBD | ⬜ |
| 9 | Per-concept mastery from bonus objectives | TBD | ⬜ |
| 10 | Adaptive harder variants | TBD | ⬜ |

## Companion work shipped this pass

- **Light mode** — class-based dark variant (`globals.css`), no-flash pre-paint script
  (`layout.tsx`), `ThemeToggle` in the header, persisted as `ae-theme` (defaults to the
  OS setting). The codebase already used light defaults + `dark:` overrides, so both
  themes render correctly. Files: `app/globals.css`, `app/layout.tsx`,
  `app/components/ThemeToggle.tsx`.
- **Defaults listed + explained in every tab:**
  - **Conditions** — the engine flag reference (already shipped in M3), with
    per-challenge availability.
  - **Functions** — the tab is now always visible (not hidden when locked); it lists
    the challenge's available bricks with plain-English descriptions
    (`lib/authoring/bricks.ts`), and only the *composer* is gated by `functionsUnlocked`.
  - **States** — provided default states shown read-only with descriptions + how each
    is used by the rules; authoring gated by `statesUnlocked`.

## Verification

- `npm run build` ✅ · `npm run lint` ✅ · `npm test` ✅ **48 tests**
- Browser: light/dark toggle; locked challenges dimmed + unselectable; completing a
  challenge unlocks the next and fires the concept callout; staged hints reveal in
  order; Functions tab lists bricks on locked challenges.

## Decisions log

- **Progression is linear** for now (each challenge depends on the previous concept).
  The registry supports a full prerequisite graph; the map renders it linearly until a
  branch exists.
- **Completion drives mastery** — no separate progress store; `ae-complete-*` is the
  single source of truth, so clearing site data resets the journey cleanly.
- **Hints escalate but never auto-reveal** — the learner always chooses to see more.

## Next up

Skill-tree visualization (#8) and richer mastery signals from bonus objectives (#9),
then Milestone 5 (Hybrid Authoring). See [ROADMAP.md](./ROADMAP.md).
