# Codebase Assessments

A second assessment type alongside the simulation interviews. In its full (company)
form, a company gives a
candidate a **real project** (files, starter code, intentionally broken logic,
visible tests) and a scenario. The candidate explores and changes it in a
browser editor with a live preview. CTRL records the final code **and how it got
there**, then shows the hiring team a replayable timeline and a rubric to score.

## What is live: code problems in `/app`

The simple version needs no accounts, links or backend. `/app` has a **Code
assessments** section under the simulation worlds. Each card is an example
problem; opening one (`/app/code/<id>`) shows:

- the **task brief** on the left (Markdown subset: headings, bullets, quotes,
  `code`), resizable;
- a **VS Code-style workbench** on the right: file explorer, tabbed editor, a
  **Preview** and a **Tests** panel side by side, and a status bar;
- **Reset** to return to the starting code, and **← Problems** to go back.

Work is saved **in the browser only** (local storage, every 2 seconds) and restored
when the problem is reopened in the same browser. Nothing is sent to a server.
Tests run when the learner presses ▶ in the Tests panel.

Problems live in `lib/assessment/problems.ts`. Each is a project with a fault, a
brief and visible tests:

| Problem | Level | Stack | What is wrong |
|---|---|---|---|
| Fix the cart total | easy | React | `cartTotal` ignores quantity |
| Fix the word counter | easy | JavaScript | repeated spaces and new lines inflate the count |
| Order history pagination | medium | React | pages are 0-based, no default or max limit, no total |
| The wrong product gets added | medium | React | `addToCart` uses the id as an array position; search is case-sensitive |
| Checkout must be all or nothing | hard | JavaScript | partial writes on failure; no input validation |

**Adding a problem:** add an entry to `CODE_PROBLEMS` (id, title, level, runtime id,
summary, Markdown brief, files including a test file). Check that its tests **fail
on the starter and pass on a correct fix**; `lib/assessment/__tests__/problems.test.ts`
checks the structure (ids, runtime, a test file, the entry file) but cannot run the
tests, so verify the behaviour yourself.

The sections below describe the larger **company flow** (authoring, links, one
attempt, hidden tests, reviewer dashboard). It is built and tested, but it is hidden
on production builds and not linked anywhere until
`NEXT_PUBLIC_CODEBASE_ASSESSMENTS=true`; see
[CODEBASE_ASSESSMENT_API.md](./CODEBASE_ASSESSMENT_API.md).

This page is the overview. Related docs:

| Doc | Covers |
|---|---|
| [CODEBASE_ASSESSMENT_RUNTIMES.md](./CODEBASE_ASSESSMENT_RUNTIMES.md) | The runtime-adapter contract and how to add a framework or language |
| [CODEBASE_ASSESSMENT_REVIEW.md](./CODEBASE_ASSESSMENT_REVIEW.md) | What is captured, snapshots, derived stats, the reviewer dashboard |
| [CODEBASE_ASSESSMENT_API.md](./CODEBASE_ASSESSMENT_API.md) | Routes, storage interface, links and security, the hidden-test runner |

## The three roles

```text
Company  ──► /assessments/new ──► creates assessment ──► candidate link + review link
Candidate ─► /a/<token> ────────► name + email ──► workspace ──► Submit
Reviewer ──► /review/<token> ───► submissions ──► replay + stats + rubric
```

### Company: authoring (`/assessments/new`)

- A title, a **scenario** (problem statement), a **stack** (runtime adapter), an
  optional **time limit** (5–480 minutes) and an **AI policy** (allowed or not).
- **Project files** are built in the in-page editor (add, edit, delete files) or
  by **uploading a folder**. Uploads skip `node_modules`, build output, lockfiles,
  binaries and files over 200 KB, strip a shared root folder, and list what was
  skipped so nothing disappears silently.
- Files matching the stack's test pattern (for React: `*.test.js`) are **visible
  tests**: the candidate sees and runs them.
- **Hidden tests** are a separate file set. They are stored with the assessment
  and never sent to the candidate. Any project file can be moved into hidden tests
  with one click.
- **Load an example project** fills in a small broken shop cart (React) or word
  counter (plain JS) so a company can see the whole flow in a minute.
- Creating returns two links. Keep the **review link** private (see
  [the API doc](./CODEBASE_ASSESSMENT_API.md#links-and-access)).

### Candidate: workspace (`/a/<token>`)

1. **Intro.** Scenario, time limit, AI policy, what is recorded, and a name and
   email form. Starting begins the clock.
2. **Workspace.** A file explorer, tabbed code editor with syntax highlighting, a
   live preview, and a test panel (all from Sandpack, running in the browser).
   The brief stays available above the editor. A timer counts down; autosave
   status is always visible.
3. **Tests** run when the candidate presses ▶ in the test panel. Each completed
   run is recorded. They do not run on every keystroke, so the "test runs"
   statistic reflects deliberate runs.
4. **Submit** asks for confirmation. When the time limit ends the workspace
   submits automatically.
5. **Resume.** The session id is kept in the browser's local storage. Reopening
   the link in the same browser continues the attempt. See
   [one attempt per link](./CODEBASE_ASSESSMENT_API.md#session-rules).

### Reviewer: dashboard (`/review/<token>`)

A table of candidates (status, time, test runs, hidden-test status, review
score), then per-candidate detail with process statistics, a replay slider with
diffs, and a rubric form. Details in
[CODEBASE_ASSESSMENT_REVIEW.md](./CODEBASE_ASSESSMENT_REVIEW.md).

## Code map

```text
lib/assessment/
  types.ts            Assessment, Session, Snapshot, Review, stats types
  files.ts            path rules, folder upload, diff/replay, line diff
  stats.ts            process statistics derived from snapshots
  runtime/            runtime adapters (registry.ts, examples.ts, types.ts)
  storage/            AssessmentStore interface + memory / file implementations
  server/             service.ts (all rules), link.ts, hiddenTests.ts, http.ts
features/assessment/
  author/             AssessmentAuthorPage, FileEditor
  workspace/          AssessmentWorkspace (intro, editor, autosave, submit)
  review/             SubmissionReplay, ReviewForm, format helpers
app/
  assessments/new     authoring page
  a/[token]           candidate page
  review/[token]      reviewer pages (index and per-submission)
  api/assessments     create, start/resume, autosave, submit
  api/review          save a review
```

All business rules live in `lib/assessment/server/service.ts` and take a store
as an argument, so they are unit-tested without HTTP
(`lib/assessment/__tests__/`). Route files only authenticate the link token,
parse the body and call the service.

## Design decisions

| Decision | Choice | Why |
|---|---|---|
| Where code runs | In the candidate's browser (Sandpack) | No server cost or sandbox to secure; scales to any number of candidates |
| Extensibility | Runtime adapters | React is the first adapter; another stack is a new registry entry, not a rewrite |
| Process capture | Periodic snapshots stored as diffs | Cheap to store, enough to replay and diff; keystroke capture is heavier and more invasive |
| Hidden tests | Never sent to the browser; run after submission | Anything in the browser can be read. See [the hidden-test runner](./CODEBASE_ASSESSMENT_API.md#hidden-test-runner) |
| Storage | An interface with stub implementations | The database choice is deferred without blocking the product flow |
| Links | Signed tokens (capability URLs), no accounts | A pilot needs no sign-up; see the access limits below |

## Known limits (v1)

- **No accounts.** Anyone who has a review link can read that assessment's
  submissions, and anyone can create an assessment. There is no rate limiting.
- **No hidden-test runner.** Hidden tests are stored and shown to the reviewer to
  run manually; the dashboard reports `not configured`. Running untrusted code
  needs an isolated host.
- **Storage is a stub.** `file` (JSON in `.data/`) for development; production
  needs `ASSESSMENT_STORE` set explicitly and ephemeral on serverless hosts. A
  real database implementation is the next step.
- **Resume is per browser.** Clearing site data or switching browser loses the
  session handle; the link then reports as already used.
- **Practice mounts immediately.** Sandpack's preview does not finish loading if the
  workspace is mounted late (for example after waiting for `window`), so the
  workspace always renders at once with the starting code, and saved work is applied
  after the first bundle finishes (`LocalProgress` in `CodePracticeWorkspace.tsx`).
- **Sandpack's hosted bundler.** The preview and tests run in an iframe served by
  CodeSandbox's bundler, so candidates need internet access to that service and
  their code is transpiled there. Self-hosting the bundler is possible later.
- **The AI policy is informational.** It is shown to the candidate and stored; it
  is not technically enforced and AI prompts are not captured.
- **Separate link prefix.** Assessments use `/a/<token>`, not the simulation
  interview `/i/<id>` links. They share the signing secret
  (`INTERVIEW_LINK_SECRET`) but not the token format, so one link cannot yet mix
  simulations and codebase tasks.
- **Test-run counts** come from Sandpack's test panel. Pressing the preview
  refresh or editing code does not count as a run.
