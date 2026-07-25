# Change Log — Current Product Behaviour

This is the concise, current record of user-facing and engine changes. It is
updated with each implemented feature. For detailed contracts, use
[ARCHITECTURE.md](./ARCHITECTURE.md), [RULES.md](./RULES.md), and the relevant
world document.

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
