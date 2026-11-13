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
  `code`, fenced code), resizable, with the problem **title and level** at its top;
- a **VS Code-style workbench** on the right: file explorer, tabbed editor, a
  **Preview** and a **Tests** panel side by side, and a status bar;
- **Reset** to return to the starting code, and **← Problems** to go back.

Work is saved **in the browser only** (local storage, every 2 seconds) and restored
when the problem is reopened in the same browser. Nothing is sent to a server.

**Tests** run when the learner presses **▶ Run tests** next to the Tests heading
(they never run on their own). The button waits for the latest edit to compile and
for the runner to be free, and re-runs once if the runner reloads mid-run (see
[known limits](#known-limits-v1)). **Verbose** lists every test; off, it shows one
line per file.

**Preview:** **Fit / Phone 375 / Tablet 768 / Desktop 1200** set the preview's
width. **Open in new tab ↗** (or **Copy link**) opens `/app/code/<id>/preview`, a
full-window preview of the work saved in this browser that restarts (~1 s) whenever
the workspace saves a change. Each problem has its own link and saved copy; the same
problem open in two editor tabs shares one copy, and the last save wins.

Problems live in `lib/assessment/problems.ts`. Each is a project with a fault, a
brief and visible tests:

| Problem | Level | Stack | What is wrong |
|---|---|---|---|
| Fix the cart total | easy | React app | `cartTotal` ignores quantity |
| Fix the word counter | easy | JavaScript | repeated spaces and new lines inflate the count |
| Order history pagination | medium | React app | pages are 0-based, no default or max limit, no total |
| The wrong product gets added | medium | React app | `addToCart` uses the id as an array position; search is case-sensitive |
| Checkout must be all or nothing | hard | JavaScript | partial writes on failure; no input validation |
| Make the storefront responsive | medium | React app | desktop-only Tailwind classes: fixed widths and header height, non-wrapping nav, big heading, 3-column grids, no viewport meta |

**React problems use the standard React app layout** (runtime `react-app`, built by
`reactApp()` in `lib/assessment/reactApp.ts`), styled with Tailwind:

```text
package.json          react, react-dom, react-scripts; main: src/index.js
public/index.html     the page (<div id="root">)
src/index.js          starts the app, imports index.css, loads Tailwind
src/index.css         global styles
src/App.js            the app
src/App.css           custom styles for App (one or two real rules); the rest is Tailwind classes
src/components/ …     src/utils/ …  src/data/ …  with tests next to the code
```

The project's files are the whole project: Sandpack's template files (`/App.js`,
`/index.js`, `/styles.css`) are not added (see
[the runtimes doc](./CODEBASE_ASSESSMENT_RUNTIMES.md#standalone-projects-the-react-app-runtime)).
Each problem sets `openFile` (the file the work starts in) and `tabs`. Work saved in a
browser before the move to `src/` doesn't contain `/src/App.js` and is ignored, so the
problem opens with the new starting code.

**Brief structure.** Every brief follows the same sections, built with the `brief()`
helper in `problems.ts`:

1. `# The situation`: who the learner is, what the product is, what is going wrong
   and why it matters, followed by the user or team reports as `>` quotes.
2. `# Your tasks`: `## Task n` sections with concrete rules, naming the files and
   functions, plus what the learner should see in the preview when it works.
3. `# Project files`: a fenced file tree, one line per file on what it does, and
   the template setup files to leave alone (`REACT_SETUP` / `VANILLA_SETUP`).
4. `# How to check your work`: the shared `HOW_TO_CHECK` text (Run tests, preview
   and new tab, Reset).

**The responsive problem's tests.** The project is styled only with Tailwind (v4
browser build, loaded from `index.js`). jsdom has no layout engine and Tailwind doesn't
run in the tests, so `test-utils/layout.js` (shipped in the project) reads the Tailwind
classes on each rendered element and applies the ones whose breakpoint prefixes match a
width (`sm`/`md`/`lg`/`xl`/`2xl`, `max-*`, `min-[..]`/`max-[..]`), using Tailwind's
default scale and arbitrary values. It understands the layout utilities (display, flex
direction and wrap, `grid-cols-*`, width/min/max/height/size, padding, gap, text size,
overflow) and merges any ordinary CSS rules the page loaded (`@media` included). The
tests find each part of the page by `data-section` and check it at 375, 768 and 1200px.
Verified in a browser against the starter (fails all but desktop), a breakpoint
solution, a fluid solution (`grid-cols-[repeat(auto-fit,minmax(..))]`,
`text-[clamp(..)]`, `w-[min(..)]`) and a menu-button solution (`hidden md:flex` plus a
`button[aria-expanded]`), all 12/12, and a half fix that fails exactly what it skipped.
A real browser with Tailwind applied agreed in every case. Limits: percentages are
measured against the screen width, a flex-wrap product grid isn't counted (the brief
asks to keep grids), and the tests check classes, not pixels, so Task 3 asks for a
visual check with the preview sizes.

**Adding a problem:** add an entry to `CODE_PROBLEMS` (id, title, level, runtime id,
summary, brief in the structure above, files including a test file). Optional
`openFile` picks the file opened first (default: the runtime's entry file) and `tabs`
limits the editor tabs to the files the learner works on; every file stays in the
explorer. The responsive problem opens on `App.js` and keeps `test-utils/` and setup
files out of the tabs. Larger file sets
can live in their own module (see `responsiveProblem.ts`, which uses `String.raw` so
regexes keep their backslashes). Check in a browser that its tests **fail on the
starter, pass on a correct fix, and pass when run straight after the fix is typed**.
`lib/assessment/__tests__/problems.test.ts` checks the structure (ids, runtime, a test
file, the entry file) but cannot run the tests.

**Styling a problem: use Tailwind CSS.** Problem projects are styled with Tailwind
classes, not CSS files. Load Tailwind v4's browser build from `index.js`
(`document.head.appendChild` of a script with
`src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"`; see
`responsiveProblem.ts`). A `<script>` tag in `index.html` is not executed by Sandpack,
and installing `@tailwindcss/browser` as an npm package left the preview stuck.
Tailwind's styles exist only in the preview, so tests that check styling must read the
classes (as the responsive problem's `test-utils/layout.js` does; see
[CODEBASE_PROBLEM_TESTS.md](./CODEBASE_PROBLEM_TESTS.md)). Plain `.css`, CSS Modules,
Sass and Less also work in both stacks if a problem ever needs them.

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
| [CODEBASE_PROBLEM_TESTS.md](./CODEBASE_PROBLEM_TESTS.md) | Every problem's tests, how the responsive layout tests work, the unit tests, and how they were verified |

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
3. **Tests** run when the candidate presses **▶ Run tests** next to the Tests
   heading. Each completed run is recorded. They do not run on every keystroke, so the "test runs"
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
  problems.ts         the /app code problems, brief() helper, shared brief text
  reactApp.ts         the standard React app layout and the React problems' files
  responsiveProblem.ts  files for the Tailwind responsive problem (incl. test-utils/layout.js)
  storage/            AssessmentStore interface + memory / file implementations
  server/             service.ts (all rules), link.ts, hiddenTests.ts, http.ts
features/assessment/
  author/             AssessmentAuthorPage, FileEditor
  workspace/          AssessmentWorkspace (intro, editor, autosave, submit)
                      WorkspaceShell (layout, Run tests, preview sizes and link)
                      CodePracticeWorkspace, PracticePreview, practiceStorage
                      (the /app problems, the new-tab preview, saved work)
  review/             SubmissionReplay, ReviewForm, format helpers
app/
  assessments/new     authoring page
  a/[token]           candidate page
  app/code/[id]       practice problem; /preview is the new-tab preview
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
  refresh or editing code does not count as a run. When the Run tests button
  re-runs after a runner reload, one click can record two runs.
- **Sandpack test-runner quirks the Run tests button works around**
  (`RunTestsButton` in `WorkspaceShell.tsx`): an edit reaches the runner only after
  the recompile delay (600 ms) plus a compile; in React projects, after a run, the
  test frame reloads itself shortly after each edit and drops the run in flight
  (its messages don't come through Sandpack's `listen`, so the button watches
  `window` messages); and a run sent the instant the runner reports ready is
  ignored. If Sandpack changes these behaviours, re-check this button first.
- **First run is slow.** The test runner needs about 3–6.5 s after page load
  (it downloads Jest and the project's packages from CodeSandbox). Later runs take
  0.5–2 s.
- **Plain-JS projects use the React bundler.** Sandpack's `vanilla` bundler cannot
  parse modern syntax, so vanilla projects run with
  `customSetup: { environment: "create-react-app" }` (see
  [the runtimes doc](./CODEBASE_ASSESSMENT_RUNTIMES.md#how-the-workspace-uses-an-adapter)).
- **New-tab preview is per browser and practice-only.** It reads local storage, so
  it doesn't work for company assessment links (`/a/<token>`), whose work is on the
  server. Under React Strict Mode (dev), a preview-only Sandpack provider never
  clears its loading overlay and ignores `updateFile`, so `PracticePreview` hides the
  overlay and remounts on each change.
