# Codebase Assessments — Process Capture and Review

This document covers what CTRL records about a candidate's work, how it is
stored, and what the reviewer sees. Source: `lib/assessment/files.ts`,
`lib/assessment/stats.ts`, `features/assessment/review/`.

## What is captured

| Data | Source | Notes |
|---|---|---|
| Final files | Submit request | Stored as `session.files` |
| Snapshots | Autosave (every 10 s when files changed), test runs, start and submit | Stored as diffs (below) |
| Test runs | Sandpack test panel `onComplete` | One `run` snapshot each, recorded even if no files changed |
| Identity | Name and email entered at start | Not verified |
| Timing | Server clock: start, last save, submit | Late flag when submitted after the limit |

Not captured in v1: keystroke-level replay, file-open/focus time, copy and paste
events, AI prompts, console output or the test results themselves (only that a run
happened).

## Snapshots

A snapshot is a change set against the previous snapshot:

```ts
interface Snapshot {
  at: number;                         // ms since the session started
  reason: "start" | "autosave" | "run" | "submit";
  changes: Record<string, string | null>;   // path -> new content, null = deleted
}
```

- The first snapshot (`start`) holds the whole starter project, so the history is
  self-contained.
- An autosave with no changes writes **no** snapshot. A `run` or `submit` always
  does, even with empty `changes`.
- Diffs are computed against the **replay** of earlier snapshots, never trusted
  from the client, so a stale or malicious client cannot corrupt history.
- A cap of **500 snapshots** per session applies to autosaves and runs. After the
  cap, the working files still update and the final `submit` snapshot is always
  stored, so the end state is always exact; only the intermediate history stops.
- `filesAtSnapshot(snapshots, i)` rebuilds the project at any step.

## Derived statistics

`computeSessionStats(session, assessment)` returns, from snapshots and the starter
files:

| Stat | Meaning |
|---|---|
| `durationMs` | Start to submit (or last save if unsubmitted) |
| `snapshotCount` | Steps in the replay |
| `runCount` | Completed test runs |
| `timeToFirstRunMs` | How long until the first run, or null |
| `filesChanged`, `filesAdded`, `filesDeleted` | Starter project vs final |
| `linesAdded`, `linesRemoved` | Line diff, starter vs final |

How to read them: many runs with small changes between suggests an
iterate-and-verify approach; a large rewrite with a single run suggests
big-bang changes; a very short session with large additions deserves a closer look
at the replay.

## The reviewer dashboard

**Index** (`/review/<token>`): one row per candidate with status (submitted, late,
in progress), time, test runs, hidden-test status, and review score with
recommendation. The candidate link is shown for convenience.

**Detail** (`/review/<token>/<sessionId>`):

1. **Stat tiles** (the table above).
2. **Hidden tests**: the runner's result when one is configured; otherwise
   `not configured` with the hidden test files shown to run manually.
3. **Replay**: a slider over the snapshots. For the chosen step, a file list marks
   what changed and the main pane shows a line diff. "Compare with" switches
   between the previous step and the starting code. Ticks under the slider mark test
   runs and the submit.
4. **Review form**: a score for each rubric criterion, free-text notes and a
   recommendation (advance, hold, reject).

## Rubric

Each assessment has up to 10 criteria with a max score (1–10). The default set
(scored 0–5):

- Understanding the codebase
- Correctness
- Code quality
- Engineering judgement

Scores are validated against each criterion's max. The dashboard shows the total
over the maximum. The authoring page does not yet edit the rubric; the API accepts
a `rubric` array and the service defaults to the set above (`DEFAULT_RUBRIC`).

## Privacy

Candidates are told on the intro screen that their work and the way it changes are
recorded. Snapshots contain only the project's files. Names and emails are stored
with the session; deletion tooling does not exist yet.
