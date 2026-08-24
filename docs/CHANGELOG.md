# Change Log — Current Product Behaviour

This is the concise, current record of user-facing and engine changes. It is
updated with each implemented feature. For detailed contracts, use
[ARCHITECTURE.md](./ARCHITECTURE.md), [RULES.md](./RULES.md), and the relevant
world document.

## 2026-08-03 — Supermarket shelf-restocking world

- Added *Mini Market Opening Run*, an Easy / Grade 3 test stage for the CC0
  Kenney Mini Market 1.0 pack. Eleven coherent isometric previews are curated
  under `assets/supermarket/kenney-mini-market/` with a manifest and preserved
  license; no WebGL dependency is introduced.
- Added a `kenney-mini-market` presentation variant over a real `16 × 14`
  collision grid. The bakery-first reference policy passes with zero lost sales;
  an empty-first policy fails the early bakery deadline in regression coverage.
- Added *Closing Rush*, an Easy / Grade 2 supermarket level with a larger
  `18 × 16` store, category-specific restocking conditions/actions, an early
  chilled-demand deadline, and explicit zero-lost-sale/zero-route-failure
  objectives. A generic empty-first policy is covered as a failing case.
- Added a separate illustrated supermarket floor that uses the curated Modern
  Convenience Store assets. Equipment art is contained inside authoritative
  two-cell fixture footprints; it cannot overlap open aisles or change the
  collision grid. Level 1 retains its strict architectural presentation.
- Added chilled, produce, snacks, drinks, and bakery dispatch actions plus live
  department-needs facts and category completion accounting.
- Added the `supermarket` WorldModule as a separate retail domain rather than a
  renamed Warehouse level. Customer demand changes shelf inventory while the
  shared engine continues to run one observation, decision, and action per tick.
- Added *First Restock*, a guided tutorial with one B1 restocking bot, five
  departments, category-specific backroom stock, reorder points, timed demand,
  travel/service delays, and lost-sales accounting.
- Supplied a working, editable three-rule policy that restores empty shelves
  before low shelves and waits safely while B1 is busy.
- Replaced the renderer-owned placeholder map with a shared `18 × 14` physical
  contract. The engine and strict plan-view renderer now use the same blocked
  fixture cells, shelf service points, stockroom doorway, aisles, checkout bank,
  and entrance. The shared Studio layout remains unchanged.
- Curated 18 Modern Convenience Store sprites and one CC0 Kenney bot into
  `assets/supermarket/`, with semantic filenames, a source manifest, and both
  source licenses.
- Added `/supermarket` catalogue and challenge routes, a Supermarket Code
  Controller starter, grouped fact reference, curriculum concept, playback
  profile, compact interview-link pack code, and complete simulation docs.
- Added regression coverage proving the reference policy completes with no lost
  sales and a wait-only policy records real failures.
- Added breadth-first routing over the real floor. Every job now executes the
  full standby → stockroom → shelf → standby lifecycle with distinct travel,
  loading, unloading, and returning phases. Remaining route cells are visible;
  fixtures can never be crossed; safe detours and sealed-route failures are
  covered by tests.
- Reworked the floor from oversized, overlapping perspective art into compact
  plan symbols: enclosed rear receiving, perimeter refrigeration, three
  gondola runs, two longitudinal aisles, cross-aisles, a produce island, three
  aligned checkout lanes, and a separate entrance. Stock information is
  attached to fixture ends rather than floating across circulation space.
- Verified the architectural and illustrated Supermarket challenges at desktop
  and responsive sizes. **26 test files / 157 tests**, strict TypeScript, and
  ESLint pass after the third-level addition.

## 2026-08-03 — Warehouse First Orders operations pass

- Replaced the warehouse's placeholder cells and emoji/badge visuals with a
  compact sprite-backed factory floor: receiving, four storage racks, a main
  picking aisle, packing/shipping, and one top-down picker robot.
- Curated only the relevant source art into `assets/warehouse/`, preserving both
  licenses and adding a machine-readable asset manifest plus selection notes.
  Unrelated asset-dump material is not imported by the application.
- Added a responsive live flow header and workboard showing inbound order state,
  current policy target, robot motion, packing progress, order arrival countdown,
  order completion, and penalty.
- Added accessible read-only inspection for robots, shelves, packing, and orders.
  These interactions explain runtime state without becoming a second manual
  control path around Visual Policy or Code Controller.
- Fixed tick-zero orders being actionable in the engine while still appearing
  `scheduled` in the renderer. Initial orders now start `open`; later orders
  retain the scheduled-to-open lifecycle.
- Staggered the tutorial's three inbound orders across ticks 0, 4, and 8 so the
  queue visibly changes while keeping the first level focused on dispatch rather
  than deadlines.
- Added `smallItemsPicked`, `largeItemsPicked`, and `frozenItemsPicked` domain
  metrics. First Orders now verifies that all six of its small item-units were
  handled, instead of carrying a redundant no-deadline objective.
- Rewrote the level narrative, intelligence explanation, hints, and live task
  wording around the actual central-dispatch lifecycle.
- Replaced ambiguous logistics terminology in the learner-facing Warehouse
  surfaces with direct language: process orders, complete orders, and deliver
  to packing.
  The exposed fact is now `ordersCompleted`, so the old wording does not remain
  in the Rules or Code reference either.
- Preloaded the verified five-rule, one-picker solution into First Orders.
  `scaffoldVersion: 3` intentionally replaces older empty or multi-robot browser
  drafts, while keeping all rules editable after the first load.
- Preserved the shared Studio page proportions used by every simulation. The
  compact factory arrangement is contained entirely inside the Warehouse
  renderer and does not change the platform layout.
- Updated the warehouse, architecture, engine-loading, schema, product, roadmap,
  and milestone documentation to remove the superseded grid/package-station
  model.
- Verified **25 test files / 148 tests**, strict TypeScript, clean ESLint, the
  optimized Next.js production build, and a live `200` response from
  `/warehouse/warehouse-first-orders` under the Next development server.

## 2026-07-31 — Demo-mode Code submission

- Renamed the interview action from **Submit policy** to **Submit solution** so
  it applies correctly to both authoring modes.
- **Submit solution** now follows the active controller. Visual Policy keeps its
  protected server evaluation; Code Controller requests the scenario suite only
  after the submit click and runs the candidate JavaScript against the real
  engine in a browser Web Worker.
- A fresh controller instance is compiled for each scenario, preserving class
  state between ticks without leaking state between cases. A two-minute
  whole-suite timeout terminates runaway demo evaluation.
- The result card presents both paths as **hidden evaluation scenarios** and
  explains the operational variations they cover without exposing technical
  execution details in the candidate-facing interface. The security difference
  between Demo Code and server Visual Policy remains documented for operators.
- Extracted Finance and Parking scenario scoring into one shared evaluator so
  browser Demo and server Visual Policy paths use the same metrics, guardrails,
  and pass contract.
- Added the no-store `POST /api/interview/demo-suite` endpoint and regression
  coverage for submit-time suite delivery and Code-driven Finance evaluation.
- Verified strict TypeScript, clean ESLint, **26 test files / 157 tests**, the
  production Next.js build, the emitted Turbopack worker entry, and a live
  production response for the eight-case Peak Hour demo suite.
- Standardized the action label as **Submit Solution**, including repeat
  submissions.
- Fixed `Unexpected end of input` during Code submission under `next dev`.
  Next 16.2's Turbopack development worker concatenated a source-map directive
  into its bootstrap. Demo development now uses the same browser evaluator
  directly and yields between scenarios; production retains the Web Worker.
- Removed the implementation/security notice from the candidate-facing Code
  Controller editor. The execution distinction remains documented for project
  maintainers.

## 2026-07-31 — Explicit live Finance provider snapshots

- Reworked the Finance provider-detail cards around a tick-stamped runtime
  snapshot. Every displayed operational value is recomputed after each
  simulation tick.
- Separated configured success targets from observed success. A provider with
  no completed attempt now displays **Awaiting outcome** instead of presenting
  its authored target as measured telemetry.
- Exposed base latency, congestion-added latency, active/concurrent capacity,
  free slots, current utilization, settled/failed attempts, measured run
  latency, current fee, and expected attempt cost in the provider details.
- Added regression coverage for schedule-driven fee, reliability, latency,
  availability, and capacity changes, plus congestion and rolling telemetry.
- Added [UX_FIRST_GLANCE.md](./UX_FIRST_GLANCE.md), a staged proposal for
  reducing first-open confusion without combining the independently scrolling
  policy and simulation work surfaces.

## 2026-07-31 — First-glance Studio hierarchy

- Replaced the automatically opened full-screen Guide with a dismissible
  three-step coach inside the real workspace. The full Guide remains available
  from the header.
- Reorganized authoring into **Policy / Code / Reference**. Policy preserves
  dedicated Rules, Conditions, and Functions views; States and Memory remain
  available under Advanced.
- Removed the duplicate editor-bottom Apply & Run action and made the workspace
  header sticky on smaller screens.
- Added responsive **Build / Run** workspace tabs so a long policy is never
  stacked above a long simulation on small screens.
- Replaced the rule card's unbounded native condition select with a searchable,
  grouped, dark-mode-aware popover capped to a short scroll region. Raw
  expression autocomplete now shows at most 12 suggestions before asking the
  user to narrow the query.
- Replaced Code mode's wall of fact chips with a searchable, grouped, bounded
  Inputs and Outputs reference. Conditions and Functions retain their full
  explanatory panels and composers.
- Merged Task Progress and Policy Constraints into one live pass-contract
  surface for authored objectives.
- Added causal decision metadata to engine traces. Debug now explains the
  selected WHEN branch, why it won, and when an unsafe Code Controller request
  was converted to `wait`.
- Hardened world-runtime access so shared UI cannot mistake Finance or
  Warehouse state for Parking state.
- Restored the complete problem statement directly above the solution tools,
  removed its disclosure toggle, and added an explicit cue to scroll down and
  solve. Removed the redundant Apply & Run / Submit explanation from the Run
  panel and first-run coach.
- Extended guided rule conditions with parenthesised child groups whose
  AND/OR connector is independent from the parent. Numeric comparisons can now
  compare one live fact with another, so expressions such as
  `A && B && (!C || scoreB >= scoreC)` no longer require raw mode.
- Moved the searchable condition menu into a viewport-positioned portal. It
  opens above or below the triggering chip, remains internally scrollable, and
  no longer expands the rule card or browser scroll area.
- Stabilized Parking departure animation identity at the tick an exit begins,
  preventing an outgoing car from remounting and appearing twice when its
  runtime status becomes departed.
- Verified strict TypeScript, ESLint, **25 test files / 152 tests**, the
  production Next.js build, and successful Finance, Maze, Parking, Warehouse,
  and Lab route renders.

## 2026-07-30 — Auditable policies and consistent interview grading

- Made the active decision source explicit with a persisted **Visual Policy /
  Code Controller** selector. Opening Code no longer inserts source or silently
  takes control from visual rules.
- Task Progress, visible policy constraints, and post-run Results now evaluate
  the same required objective expressions. Manual **Step** also executes the
  same completion, grading, persistence, and attempt logic as autoplay.
- Interview stages now label local success as **Visible case passed**. Submit
  reports every hidden case's actual value, required limit, and pass/fail for
  each guardrail; the overall result still requires every case plus the authored
  average-score threshold.
- Finance records a reason for every failed provider attempt and every terminal
  decline/timeout. The renderer retains **Latest activity** and adds a
  collapsible failure log plus an auditable score breakdown for provider fees,
  failed attempts, timeouts, priority misses, overload, and queue pressure.
- Parking records human-readable reasons on every hard or preference allocation
  violation. Policy diagnostics expose the violating vehicle and bay plus a
  complete parking-penalty breakdown.
- Finance playback now starts at **10 ticks/s** with a maximum of **20**.
  Parking starts at **5 ticks/s** with a maximum of **15**. Studio and Lab share
  the same profiles.
- Corrected the outgoing car orientation so exit-route sprites drive forward.
- Interview link creation verifies that every selected problem round-trips
  through the signed token and shows the verified assigned count. Added a
  Select all action and full-pack round-trip regression coverage.
- Active-world validation now rejects conditions and derived facts belonging to
  a different world before the first tick. Code references are resolved from
  the challenge's actual world kind rather than assuming the pack ID is the
  module ID.
- Non-grid worlds no longer show irrelevant position/wall observations in the
  shared debug panel. Removed the unpublished Maze level-5 challenge file.
- Replaced the stock Create Next App README and refreshed current documentation.
- Verified **25 test files / 147 tests**, ESLint, strict TypeScript, and the
  production Next.js build.

## 2026-07-28 — Global interview-link reset

- Cleared every previously issued signed interview assignment by advancing the
  global token generation from version 3 to version 4.
- Versions 1–3 are now rejected. Only links generated after this reset can open
  an interview assignment.
- Added a regression using a previously valid version-3 assignment to prevent
  an older generation from being re-enabled accidentally.

## 2026-07-28 — Real-time Finance provider telemetry

- Finance now records attempts, completions, successes, failures, and measured
  latency independently for every provider.
- Provider lanes and cards update on every simulation tick with live status,
  observed success rate, current congestion-adjusted latency, run-average
  latency, active work, free capacity, utilization, health, and settled attempt
  counts.
- Added a live operations strip for queue depth, in-flight work, overall success
  rate, and throughput. Online lanes remain green, busy lanes amber, and offline
  lanes red.
- Exposed the measured values as Finance facts so both visual policies and
  Code mode can react to `observedSuccessRateX`, `averageLatencyX`,
  `utilizationX`, `attemptsX`, and `completedX`.

## 2026-07-29 — Finance transaction lifecycle view + reference solutions

- Made the Finance board read as a running system instead of a scoreboard. It now
  shows the **whole payment population moving** through a pipeline bar
  (arriving → queued → in flight → settled), so progress is visible even when the
  ready queue stays near 1 because arrivals and routing are balanced.
- Queue entries now show **ticks waited and deadline remaining**, and turn red
  within five ticks of expiry, making pressure and near-misses visible.
- Provider lanes show the **actual in-flight payments** with a per-payment
  progress bar and remaining ticks, attributed to the lane processing them.
- Added visible **stuck work**: counts for retry backoff, near-deadline items, and
  upcoming arrivals, plus a **latest activity feed** of settlements with
  succeeded / failed / declined / timed-out outcome tags and overload rejections.
- Added finance lifecycle selectors (`inFlightTransactions`,
  `retryingTransactions`, `scheduledTransactions`, `deadlineRemainingFor`,
  `recentSettlements`) so the renderer stays free of domain logic.
- Added reference rule solutions as regression tests for **21 Peak Hour Payment
  Switch** and **24 Autonomous Parking Operations**, proving both stages remain
  solvable with visual rules alone.

## 2026-07-28 — Active-rule highlight and Code-mode reference

- Studio now **highlights the rule card firing on the current tick** (soft amber)
  live during a run, so the decision flow is visible as it advances.
- Code tab gained a self-documenting reference: what you can read
  (`observation.*` base senses plus this world's `observation.domain.*` facts with
  labels) and the exact action strings you may return.
- Code tab provides an insertable **starter skeleton** (class + `decide` stub
  with a safe default return) per world.
- A `THEN` per-rule sequencing directive was prototyped and then reverted;
  sequencing remains multi-step bricks composed in the Functions tab.

## 2026-07-28 — Clearer challenge statements and learner flow

- Rewrote the published Maze, Warehouse, Finance, and Parking challenge copy in
  a consistent plain-language structure: scenario, task, learning goal, current
  scaffold behaviour, and next action.
- Added blank-line paragraph support to authored challenge prose so longer
  statements no longer render as dense blocks.
- Added labelled **Scenario**, **Problem statement**, and **What this teaches**
  sections to the shared challenge brief, plus a short edit → run → inspect
  instruction visible on every level.
- Task checklists now show their authored step guidance beside each item, making
  the live flow useful before and during a run.

## 2026-07-26 — Detailed walkthrough and global interview-link reset

- Rebuilt the challenge walkthrough as a responsive, full workspace guide with
  clickable step navigation, progress, independent scrolling, light/dark
  styling, concrete interface locations, world-specific facts/actions, safe
  rule examples, warnings, and a separate interview-submission explanation.
- Expanded onboarding from four short paragraphs to the complete workspace map,
  task-reading, intelligence-layer, tick-execution, visible-run, debugging, and
  hidden-evaluation workflow. Escape, close, skip, back, direct step selection,
  and reopen-through-Guide are supported.
- Cleared all previously issued interview links by moving signed assignments to
  revocation generation/token version 3 and intentionally rejecting versions 1
  and 2.
- Retired predictable `/interview/[challengeId]` sharing because those URLs
  could never be revoked; the legacy route now always returns 404.
- Consolidated both single-challenge and multi-challenge sharing through
  `POST /api/interview/assignments` and signed `/i/[assignmentId]` URLs.

## 2026-07-26 — Finance hold safety, live lanes, and challenge walkthrough

- Prevented an unconditional Finance `hold` policy from appearing successful
  after timing out every payment: an all-terminal run with zero successful
  transfers now resolves as `stuck`.
- Added regressions for queued timeout handling and the Peak Hour hold-only
  exploit while preserving `allProcessed` as the terminal-state metric used by
  timeout-tolerant objectives.
- Recorded every Finance policy decision, including holds and declines, so the
  AI router reflects what the program is doing on the current run.
- Made provider lanes visibly live: available is green, saturated is amber,
  offline is red, and the most recently routed lane is blue. Success rate,
  effective latency, active work, capacity, and health update with the runtime.
- Replaced ambiguous “Queue cleared” and raw score output with explicit
  successful/exception outcomes, status chips, and a two-decimal **penalty
  score — lower is better** label.
- Replaced the global one-line onboarding banner with a reusable guided
  walkthrough covering the brief, authoring, Apply & Run, diagnostics, and
  interview Submit. A persistent **Guide** action reopens it on any challenge.

## 2026-07-26 — Interview challenge workspace layout parity

- Made selected shared interview problems use the normal challenge Studio
  frame, two-panel workspace, and header problem-list interaction.
- Replaced the interview-stage badge with an **Interview problems** trigger in
  the same position as the normal **Problem list** trigger.
- Removed the extra interview notice banner that changed the challenge
  workspace's vertical layout.
- Added an interview-only drawer showing assignment details, link access,
  evaluation and submission information, and only the assigned problems.
  Normal world filters, curriculum data, and unrelated levels remain excluded.

## 2026-07-26 — Interview assignment directory and nested problem routes

- Changed compact shared links to open an interview-only directory listing
  every assigned challenge instead of immediately entering the first problem.
- Added an interview sidebar containing only assignment details, link access,
  evaluation coverage, and the assigned problem list; normal world filters,
  curriculum details, unrelated challenges, and Lab remain absent.
- Added `/i/[assignmentId]/[challengeId]` for entering a selected assigned
  problem and verifying that it belongs to the signed assignment.
- Updated in-workspace assignment navigation and next-problem actions to use the
  nested routes. Legacy `?problem=n` links redirect to the corresponding route.
- Documented the current link lifetime: compact links have no scheduled expiry
  and remain valid until the signing secret or referenced registry content
  changes.

## 2026-07-26 — All published levels available in interview assignments

- Expanded the world-page assignment selector from only scored Finance/Parking
  stages to every published Maze, Warehouse, Finance, and Parking level.
- Kept a world's explicitly marked interview tutorial required and first where
  one exists; worlds without that marker can share any selected levels.
- Added assignment navigation and isolated per-assignment persistence for
  ordinary levels that have visible objectives but no server-only hidden suite.
- Versioned the compact token format to include world identity, preventing
  collisions where two worlds reuse the same level number, while preserving
  resolution of existing version-1 links.
- Added coverage for ordinary-level API links, same-number cross-world tokens,
  canonical ordering, and ordinary Studio pages inside interview assignments.

## 2026-07-26 — Code-mode execution and multilingual runner documentation

- Added `CODE_MODE.md` as the detailed source of truth for the Code editor,
  browser compiler, observation contract, controller tick lifecycle, world
  action handling, simulation time, Rules interaction, and Interview Submit.
- Documented that a non-empty Code tab replaces visual rule selection during
  Apply & Run; the two representations are saved together but do not currently
  synchronize.
- Specified a language-neutral persistent JSON Lines controller protocol for
  JavaScript, Python, Java, Go, C++, Rust, and future runner adapters.
- Defined the hybrid evaluation boundary: visible examples and candidate-authored
  tests may run in browser workers, while hidden and final interview suites must
  run in isolated server workers/containers.
- Documented why downloading hidden cases or remotely accepting browser-chosen
  actions cannot provide authoritative interview evaluation.

## 2026-07-26 — Naira display and verified controller solutions

- Changed every Finance monetary display from dollars to Nigerian naira,
  including queue amounts, the active transfer, provider fees, expected costs,
  total cost, debug facts, and cost-bearing challenge copy.
- Added explicit currency metadata to Finance domain facts so the shared debug
  panel renders monetary observations as `₦` values with two decimal places.
- Kept scenario numbers and objective thresholds unchanged; this is a currency
  denomination/display correction, not a scoring rebalance.
- Retained the stateful right-hand-follower solution for level 6 and its
  at-most-80-tick Branching Maze regression.
- Added and verified a load-, deadline-, retry-, and congestion-aware Code-mode
  solution for level 21 against every visible Peak Hour Payment Switch
  objective.

## 2026-07-26 — Condition, function, state, and Code authoring corrections

- Replaced the browser-native condition `datalist` with a light/dark themed
  autocomplete anchored below each expression input.
- Made the suggestion list independently scrollable and caret-aware, so
  autocomplete continues after the first condition and replaces only the
  currently typed identifier.
- Added a collapsible operator reference under **Your conditions** covering
  boolean operators, grouping, comparisons, and reusable derived conditions.
- Corrected primitive classification: every single-action wrapper contributed
  by a world module is now locked as an engine function. Finance and Parking
  actions no longer appear incorrectly under a deletable **Your functions**
  section.
- Renamed the legitimate multi-step list to **Composed functions**, enabled
  Finance/Parking world primitives in the function composer, and upgraded old
  saved brains to the corrected classification.
- Added Finance-specific state guidance for normal routing, deadline
  protection, and outage recovery while preserving the boundary between
  controller mode and world-owned transaction lifecycle.
- Made Code mode domain-aware: the tab lists valid return actions, explains
  `observation.domain`, supplies a tested Finance controller example, and states
  clearly that JavaScript runs only for local Apply & Run—not Interview Submit.
- Added autocomplete, primitive-upgrade, Finance decompilation, and Finance
  controller execution regression coverage.
- Verified TypeScript, warning-free lint, all 129 tests across 23 files,
  whitespace integrity, and the production build.

## 2026-07-26 — Compact multi-problem interview assignments

- Added an interview-assignment selector to Finance and Parking world pages.
  Only challenges with real server evaluation contracts are selectable.
- Made each world's marked interview tutorial required and normalized every
  selection to tutorial first, then ascending difficulty, taxonomy grade, and
  challenge number.
- Added `POST /api/interview/assignments`, which validates same-world challenge
  references and returns a compact signed assignment link.
- Added `/i/[assignmentId]` for navigating an ordered interview set. The route
  resolves existing challenges from the registry; it does not create parallel
  challenge or fixture files.
- Kept the link short with a versioned challenge-number payload and truncated
  HMAC signature. Hidden tests, scoring inputs, policies, and problem text never
  enter the token.
- Added per-problem assignment navigation and isolated local rule persistence
  while preserving the interview header's hidden Back, curriculum, and Lab
  controls.
- Added assignment ordering, token-integrity, API, route-resolution, and
  interview-number uniqueness regression tests.
- Verified TypeScript, lint, all 123 tests across 22 files, whitespace
  integrity, and the production build containing both new dynamic routes.

## 2026-07-26 — Cross-world debug-panel organization

- Reorganized the shared Maze, Warehouse, Finance, and Parking debug panel.
  The main decision pipeline stays first; world observation, domain facts, and
  memory are independent accordions.
- Made the complete debug panel collapsible in both Studio and Lab.
- Replaced raw domain keys with each world module's human-readable flag labels.
- Added explicit percentage metadata for Finance reliability/success/congestion
  and Parking utilization.
- Formatted computed domain and memory numbers to two decimal places with
  thousands separators. For example, `6863.700000000001` now renders as
  `6,863.70`.
- Removed every pre-authored rule from all six Finance and Parking interview
  stages. Primitive functions remain available, but candidates build the entire
  decision flow.
- Moved interview persistence to a new empty-scaffold namespace so previously
  shipped starter rules do not reappear. Older local-storage entries remain
  untouched rather than being deleted.
- Added contract tests for numeric/percentage formatting and empty interview
  scaffolds.
- Switched the simulation stage's debug-panel reference to a direct sibling
  import so Turbopack can recover cleanly when the panel file is replaced
  during development.
- Verified TypeScript, lint, all 118 tests across 21 files, whitespace
  integrity, and the production build.

## 2026-07-26 — Challenge-ID interview sharing

- Corrected the original navigation-only share control. **Share interview** now
  constructs the absolute interview URL, displays it in a selectable field, and
  copies it automatically when the browser permits clipboard access. A manual
  copy fallback remains visible when clipboard access is unavailable.
- Added `/interview/[challengeId]` as the dedicated share route for an existing
  interview stage.
- Kept the challenge as the single source of truth: `worldKey` supplies the
  visible case and `interviewEvaluation.suiteId` supplies the server-only set.
  No assignment JSON, fixture copies, or parallel problem statements were added.
- Added a **Share interview** entry point to normal interview challenges and a
  **Copy link** action in the shared workspace.
- Removed curriculum browsing and previous/next navigation from shared
  interviews while retaining authoring, Apply & Run, Submit, and streamed
  results.
- Removed the back control and hid the Lab switch from the shared interview
  header; normal challenge workspaces keep both.
- Added an interview notice showing the selected stage, submission-case count,
  passing score, and visible-versus-hidden execution boundary.
- Added route/reference tests proving that every interview challenge resolves
  the existing suite declared by its stage.
- Verified TypeScript, lint, all 115 tests across 20 files, and whitespace
  integrity. The production build includes `/interview/[challengeId]`; a valid
  Parking interview returned 200 and a non-interview Parking challenge returned
  404 in the production-server smoke test.

## 2026-07-26 — Parking interview simulation track

- Added **Smart Parking Controller**, **Autonomous Parking Operations**, and
  **Production Parking Orchestrator** as Higher-Medium tutorial,
  Higher-Medium, and Hard interview problems.
- Preserved the original three Parking lessons in instant mode and introduced
  explicit real-time mode for interview worlds.
- Added asynchronous `entering` and `exiting` states. Assignments reserve bays
  while cars travel in; exits release bays only after physical travel completes.
- Added shared lane capacity, exit-gate concurrency, congestion delay,
  close/reopen schedules, capacity schedules, inbound rerouting, priority,
  patience expiry, cancellation, and deterministic traffic batches.
- Split forbidden hard allocations from valid-but-lower-quality preference
  assignments and added queue, congestion, abandonment, reassignment, fairness,
  and combined operating-penalty metrics.
- Expanded the Parking renderer with closed-bay and zone labels, real-time lane
  load, abandonment, and duplicate-free inbound/outbound visualization.
- Generalized the interview result contract so Finance and Parking report
  domain-specific metrics through one Studio panel.
- Extended `POST /api/interview/submit` to resolve Parking suites server-side
  and stream 6-, 8-, or 10-case evaluations only after explicit Submit. Apply &
  Run remains limited to the visible scenario.
- Added hidden cases for changed layouts, arrival bursts, charging failure,
  exit-gate failure, reservation floods, capacity oscillation, priority
  conflict, lane collapse, adversarial fairness, and long-running stability.
- Documented the current controller boundary honestly: candidates choose
  category and scheduling; the facility allocator chooses the exact bay inside
  that category. Parameterized arbitrary zone/bay actions remain a future
  extension.
- Added engine and interview regression coverage for delayed capacity release,
  brittle-policy rejection, streamed Parking submission, adaptive production
  evaluation, and all three visible stages.
- Verified TypeScript, lint, all 112 tests across 19 files, and the production
  build including the shared dynamic `/api/interview/submit` route.

## 2026-07-26 — Finance interview simulation track

- Added Intelligent Payment Routing, Peak Hour Payment Switch, and Production
  Payment Orchestrator as higher-Medium, higher-Medium, and Hard interview
  problems.
- Extended Finance with asynchronous in-flight processing, live arrivals,
  finite concurrent capacity, congestion latency, type/value restrictions,
  deadlines, retry budgets and backoff, dynamic fee/capacity/health schedules,
  urgent traffic, and weighted service penalties.
- Added deterministic traffic batches so the hard visible problem processes 500
  payments without duplicating content records.
- Added a server-side hidden submission route with 6-, 8-, and 10-scenario
  suites, input budgets, per-scenario diagnostics, and aggregate scoring.
- Kept hidden suites completely dormant during Apply & Run. Explicit Submit now
  streams actual case-start and case-result events so Studio visibly progresses
  through every hidden case before showing the final report.
- Added ten adversarial families covering collapse, congestion cascades,
  priority surges, capacity oscillation, compatibility, deadline pressure,
  preference reversal, fee shocks, and retry storms.
- Added a Studio interview report and up to 60 decisions/second fast-forward for
  large visible streams.
- Kept arbitrary Code-mode JavaScript out of the server evaluator. Production
  deployment still requires an isolated untrusted-code runner.
- Verified JSON integrity, TypeScript, lint, all 107 tests across 18 files, and
  the production build including `/api/interview/submit`.

## 2026-07-26 — Cross-world challenge-content audit

- Audited all 18 published challenges against their actual world data, module
  observations/actions, scaffold brains, completion rules, and objective
  metrics.
- Completed the structured brief contract for every published Maze and
  Warehouse challenge: brief, context, steps, staged hints, and taxonomy are now
  authored rather than inferred from legacy prose.
- Replaced remaining learner-facing numeric-priority language with the actual
  top-to-bottom, first-matching-safe-rule model.
- Corrected the Snake Corridor lesson: rules own continuous condition checks;
  custom functions own fixed action sequences. Its documented
  `turn-left-and-step` function now runs in a solving integration test and is a
  required part of completion.
- Made Finance cost requirements enforce the optimization claims in levels
  11–14 instead of grading cost only as a bonus. Aligned Cost and Reliability
  and Provider Health taxonomy with their Medium stages.
- Corrected the Continuous Operations bonus label so it describes its real
  tick check, corrected Warehouse dataset dimensions to 11×5, and updated
  domain-brick presentation to use each scaffold's actual action and
  description.
- Added content-contract tests for complete briefs, taxonomy alignment, valid
  world conditions, documented action bricks, and retired-priority wording.
- Verified the audited content with TypeScript, lint, all 103 tests across 17
  files, and the production build.

## 2026-07-26 — Problem workspace light/dark redesign

- Rebuilt `/[pack]/[challenge]` as a compact, full-width problem workspace
  instead of placing Studio inside the broad catalogue page frame.
- Added a reference-inspired toolbar with directory navigation, previous/next
  challenge controls, a global Apply & Run action, Lab access, and the existing
  persisted light/dark theme switch.
- Changed the desktop page to independently scrolling authoring and simulation
  panes. Narrow screens stack the panes and contain wide rule-editor content
  inside the authoring surface instead of widening the whole route.
- Added a searchable, theme-aware Problem list drawer showing challenge
  difficulty, solved/unsolved state, curriculum locks, and current selection.
- Corrected the drawer's metrics to count completed challenges only in the
  active world. Its difficulty labels now use the shared catalogue policy:
  guided difficulty-1 content is a green Tutorial, followed by Easy, Medium,
  and Hard instead of every Maze item appearing as Easy.
- Kept the corrected pack-scoped solved fraction in the drawer header. Removed
  the duplicate world/“Level X of Y · N done” summary block and its visual
  progress track.
- Gave the authoring and simulation surfaces their own stable, theme-aware
  scrollbars and removed the nested authoring scrollbar. On desktop, Studio is
  locked to the viewport and the page itself no longer scrolls both panes
  together; each pane consumes the available workspace height independently.
- Preserved simulation timing, rule compilation, saved brains, completion
  gating, results, and route URLs.
- Verified both themes at 1440 × 960 and the responsive shell at 390 × 844;
  TypeScript, all 96 tests, and the production build pass. Lint has only the
  existing Finance-test warning.

## 2026-07-26 — Clickable challenge rows

- Made the complete challenge row clickable and added light/dark hover
  backgrounds, border feedback, and keyboard focus treatment.
- Kept “Open challenge” as the row link's visual action rather than a separate
  nested target.

## 2026-07-25 — Challenge-directory filters

- Added a responsive right-hand filter panel to every world challenge directory,
  moving above the list on narrow screens.
- Added functional filters for saved Solved/Unsolved status, curriculum Skills,
  authored Difficulty, and taxonomy Subdomains, plus clear and empty-result
  actions.
- Simplified row metadata to the difficulty type only. The policy explanation is
  no longer repeated after Example, Easy, Medium, or Hard.

## 2026-07-25 — Page UI consolidation and challenge folders

- Removed five single-use layers that added indirection without reuse:
  `WorldPicker`, `PackLevelPicker`, `LabWorkspace`, `ApplicationHeader`, and
  `HeaderAction`.
- Home, challenge-directory, and Lab Tailwind/JSX now live directly in their
  owning page UI components. Repeated challenge rows remain private to the
  directory page.
- Kept `PageLayout` because all four page UIs use it; its header and action markup
  are now internal implementation details.
- Removed `PageLayout`'s semantic `width="full|contained"` switch. Each page now
  declares its own Tailwind container width through `className` (`max-w-none` or
  `max-w-7xl`) at the page UI call site.
- Grouped challenge JSON by simulation pack under
  `content/challenges/{maze,warehouse,finance,parking}`. The root `index.ts`
  remains the ordered bundled registry, so IDs, curriculum order, and routes are
  unchanged.
- Verified TypeScript, all 96 tests, lint, production build, documentation links,
  and representative routes from every challenge folder.

## 2026-07-25 — Route-owned page UI

- Removed the broad `AppShell`, its `AppShellView` enum, and all
  `view="home|levels|pack|lab"` routing branches.
- Added dedicated page UI components for Home, challenge directory, Studio, and
  Lab. Route `page.tsx` files now validate/load route data and render exactly one
  corresponding feature page.
- Kept Tailwind layout and page text outside route files while making ownership
  explicit under each feature's `pages/` directory.
- Split Studio and Lab runtime state. Home and directory no longer initialize
  simulations, Lab brains, Studio persistence, curriculum, or timers.
- Converted catalogue navigation and application-header actions to real Next
  links, allowing Home and directory page UI to remain server-renderable.
- Added reusable `PageLayout`, `createSimulationSession`, and Studio persistence
  modules without changing routes, storage keys, authored data, or engine rules.
- Verified TypeScript, all 96 tests, lint, the production build, route status, and
  the generated client-reference manifests for Home, directory, Studio, and Lab.

## 2026-07-25 — Feature-oriented file structure

- Reduced `app/` to App Router concerns: route pages, the root layout, global CSS,
  favicon, and nothing else.
- Grouped React code by ownership under `features/application`, `catalogue`,
  `studio`, `lab`, and `simulation`; product-wide controls live under `shared/`.
- Moved imported parking artwork from the route tree to root `assets/`.
- Moved the bundled world/brain loader to `lib/content/datasets.ts`, correcting
  its ownership: Studio, Lab, tests, and future worlds share it.
- Extracted reusable `ApplicationHeader`, `HeaderAction`, and `LabWorkspace`
  components, plus the shared `SimulationSession` contract.
- Extracted catalogue difficulty classification into a pure module so presentation
  components and tests use the same policy without importing each other.
- Preserved all routes, persisted-brain keys, simulation behavior, and authored
  content during the reorganization.
- Verified the new boundaries, TypeScript, the production build, and all 96 tests.
  Representative Home, Maze, Warehouse, Finance, Parking, and Lab routes return
  successfully; the intentionally removed Maze Open Arena route remains 404.

## 2026-07-25 — Catalogue and level-directory revamp

- Widened the world-picker introduction/catalogue surface to approximately 80%
  of the viewport and added a five-column desktop catalogue layout.
- Replaced level-directory card grids with full-width challenge rows based on
  the supplied reference: title and difficulty context on the left, direct
  action on the right.
- Kept **Examples** as the only directory section heading. Easy, Medium, and Hard
  are now per-row metadata with their defining constraint underneath.
- Removed “Level” labels from the directory presentation and removed Maze
  challenge 5 (`open-arena`) from the shipped Maze curriculum.
- Fixed directory classification so an explicit authored `stage` wins over the
  legacy editor-feature difficulty number.
- Verified the catalogue and Maze directory at desktop and narrow widths.
  TypeScript and the production build pass; all 96 tests pass across 17 files.
  `/maze/open-arena` now returns not found while the remaining Maze routes work.

## 2026-07-25 — Parking animation handoff correction

- Removed the duplicate-car frame at the end of an assignment animation.
- The moving route sprite now becomes invisible at the destination immediately
  before the stationary occupied-bay sprite is revealed.
- This is a presentation-only correction; allocation timing, capacity, exit
  requests, scoring, and deterministic replay are unchanged.

## 2026-07-25 — Parking exit control and movement feedback

- New rule cards append to the bottom of the shared top-to-bottom flow, matching
  the ordered execution model used by Maze and every other world.
- Parking departures are now explicit decisions. A completed stay raises an
  exit request while the car still occupies its bay; `releaseVehicle` authorizes
  the oldest request, sends it through the checkpoint, and frees capacity.
- The Parking board now distinguishes arrival, assignment, ready-to-leave, and
  authorized departure transitions. These are presentation animations only and
  respect reduced-motion preferences.
- Upgraded those effects to continuous real-time routes. Assignment travels
  entrance → aisle → exact target bay; departure travels exact occupied bay →
  aisle → checkpoint → off-lot. Cars rotate at turns and the parked sprite is
  revealed only when the route reaches its destination.
- Route duration scales with the existing 1–3 ticks/second transport control and
  completes before the next deterministic decision. Manual Step still produces
  one complete animation.
- Removed redundant terminal `always → hold` cards from editable Warehouse,
  Finance, and Parking scaffolds; the engine's built-in no-match wait remains the
  safe fallback without hiding newly appended rules.
- Older locally saved brains are upgraded without discarding authored logic:
  newly shipped built-in actions are merged and a semantically redundant final
  `always → hold` is removed.
- Cross-world regression verification passes all 93 tests across 16 files,
  including dedicated bottom-append and persisted-brain migration tests;
  TypeScript and lint complete successfully (with the existing Finance-test
  unused-import warning).
- The production build succeeds, and representative Maze, Warehouse, Finance,
  and Parking challenge routes each return successfully.

## 2026-07-25 — Parking simulation (three levels)

- Added Parking as an operations/resource-allocation world rather than a
  vehicle-driving game, with its own registered non-movement world module.
- Added three playable levels: **First Shift** for queue processing and capacity
  reuse, **Match the Vehicle** for EV/large-space matching, and **Priority
  Access** for VIP/accessible/reserved allocation.
- Added ordered allocation actions, raw vehicle/capacity observations, timed
  departures, capacity reuse, violations, utilization, and waiting-time metrics.
- Added a responsive top-down facility board using the supplied parking sprite
  atlas. It visualises entrance queue, allocation controller, two marked parking
  rows, live occupancy, assignments, and departing vehicles without exposing a
  tile grid.
- Registered the Parking pack, datasets, reference brain, challenges, and
  three-step curriculum path.
- Added tests for finite-capacity reuse, misallocation violations, and successful
  completion of every authored Parking level by the reference policy.
- Verified the Parking route and renderer at desktop and narrow widths; TypeScript
  and the production build pass, and the then-current suite passed all 88 tests across
  13 files. Lint remains clean apart from one pre-existing unused-import warning
  in the Finance test.

## 2026-07-25 — Ordered decision flow and Code mode

### Implemented

- **Rules execute in authored top-to-bottom order.** The first rule whose `WHEN`
  condition is true and whose next action is safe runs. Numeric rule `priority`
  values are retained only so old saved JSON continues to load; they no longer
  affect execution.
- **Studio exposes order as `#1`, `#2`, …** Dragging and the move controls change
  that order. Rule folders only organise cards; collapsing or moving a card into
  a folder never changes execution.
- **Action safety is checked before every primitive.** A blocked `moveForward`
  is not executed. A multi-step brick whose later action becomes unsafe is
  interrupted and the decision flow resumes.
- **Code mode is available in Studio.** A locally authored JavaScript controller
  class returns one primitive action from `decide(observation)` each tick. Its
  instance fields persist between ticks; the engine still validates actions and
  owns the world, trace, objectives, and clock.
  A non-empty Code editor selects this mode on Apply & Run; clearing it restores
  visual-rule execution.

### Verified

- The ordered right-wall-flow test solves the Branching Maze within 80 ticks.
- The Code-mode `RightHandFollower` test solves the same maze within 80 ticks.
- An unsafe controller action becomes `wait`.
- TypeScript, the full Vitest suite, lint (one pre-existing warning), and the
  production build pass.

### Important limits

- Code mode is a **local Studio authoring surface**, not an isolation boundary.
  A hosted interview or competition runner must execute the same controller
  contract inside an isolated worker/container with time and memory limits.
- A controller is called once per tick. It may inspect many facts in one
  observation, but the world applies exactly one action per tick. This preserves
  deterministic replay and avoids conflicting simultaneous mutations.

## 2026-07-25 — Finance operational flow visualisation

- Added a non-grid Finance transfer-flow view above the processing card.
- It visualises the incoming transaction queue, AI routing step, and live provider
  lanes.
- The latest selected provider lane is highlighted so each route decision is
  visible in the operational flow.
- Removed the renderer's calculated “best value” label; it now shows provider
  facts only.

## 2026-07-25 — Finance: remove answer-revealing conditions

Removed the comparative Finance conditions `cheapest*`, `mostReliable*`, and
`bestValue*` from the world vocabulary and all Finance challenge palettes. They
were redundant because provider cards already show the facts used to make those
decisions.

Finance brains now use either a direct preferred-provider/failover policy
(`onlineA → route A`, then `onlineB → route B`) for fixed scenarios, or raw
comparisons over displayed facts such as `feeX` and `expectedCostX`. No new routing
mechanics or scoring model were added.
