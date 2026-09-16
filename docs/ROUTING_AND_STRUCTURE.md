# Page Routing & File Structure

Implemented reference for the route-owned page refactor. Every route now renders a
dedicated feature page component; there is no `view` enum or shared stateful shell.

## Routes

| URL | Server-route responsibility | Client view |
|---|---|---|
| `/` | none | **Default home = the companies page** — the hiring pitch |
| `/education` | none | Pitch for schools, bootcamps, and programs — teach coding and thinking |
| `/companies` | redirect | Redirects to `/` (companies is the default home) |
| `/login` | reads `?company=1` to preselect the company tab | Individual + company sign-in. **Hidden for now** — the route exists but nothing links to it; login will be implemented later. |
| `/app` | none | The product: pick a problem to solve. Open to everyone — no login required. |
| `/[pack]` | Validate the pack | Filterable challenge-row directory with per-row difficulty |
| `/[pack]/[challenge]` | Validate pack, challenge, and membership | Shareable Studio challenge |
| `/interview/[challengeId]` | Legacy predictable link | Revoked; always returns 404 |
| `/i/[assignmentId]` | Verify a signed compact same-world assignment and resolve its ordered published challenge references | Interview-only assignment directory |
| `/i/[assignmentId]/[challengeId]` | Verify both the signed assignment and membership of the selected challenge | Interview Studio workspace; hidden Submit appears only for stages with an evaluation contract |
| `/lab` | none | Raw JSON Engine Lab |
| `/api/interview/assignments` | Validate a same-world problem selection and sign its canonical references | Compact assignment link |
| `/api/interview/submit` | Validate the interview challenge and resolve its hidden suite | Streamed case results and final score |

Examples: `/maze`, `/warehouse`, and
`/warehouse/warehouse-first-orders`.

### Route implementation

```text
app/
  page.tsx                        <CompaniesPage /> (default home = companies)
  education/page.tsx              <EducationPage /> (schools, bootcamps, programs)
  companies/page.tsx              redirect("/")     (companies is the default home)
  login/page.tsx                  <LoginPage /> (hidden for now; not linked)
  not-found.tsx                   <NotFoundPage /> (custom 404 with the live demo)
  app/page.tsx                    <WorldCataloguePage /> (product entry)
  [pack]/page.tsx                 validates pack, renders <ChallengeDirectoryPage />
  [pack]/[challenge]/page.tsx     validates membership, renders <StudioPage />
  interview/[challengeId]/page.tsx validates interview stage, renders <StudioPage />
  i/[assignmentId]/page.tsx       verifies assignment, renders interview directory
  i/[assignmentId]/[challengeId]/page.tsx verifies membership, renders <StudioPage />
  lab/page.tsx                    <LabPageView />
  api/interview/assignments/route.ts compact signed assignment creation
  api/interview/submit/route.ts   hidden Finance/Parking evaluation

features/
  landing/                        public site pages, sections, and the live demo
    pages/                        CompaniesPage (/), EducationPage, LoginPage,
                                  NotFoundPage
    components/                   heros, sections, waitlist, shared Nav/Footer
    lib/                          the self-contained demo engine (sim.ts)
  engine/
    application/components/       shared PageLayout and application header
    catalogue/pages/              /app catalogue and challenge-directory page UI
    studio/pages/                 Studio page UI and Studio-only client state
    lab/pages/                    Lab page UI and Lab-only client state
    simulation/                   shared controls, stage, debug UI and renderers

shared/
  components/                     product-wide UI with no feature ownership
```

> **One app.** The public site and the product live in a single Next.js project
> and share one design system (fonts, palette, radii in `app/globals.css`), so the
> whole thing reads as one CTRL. The site pages are in `features/landing/`, the
> product in `features/engine/`. The `/` home is the **companies** page (the
> current focus); `/education` is the other audience page; `/app` is the product,
> open to everyone with no login. (The public site was originally a separate Vite
> app; that merge is complete — there is no second repo or build.)

The dynamic route pages are server components. In this version of Next's App
Router, their `params` prop is a promise, so pages await it before validation.
Invalid URLs call `notFound()`:

- unknown pack: `/not-a-pack`;
- unknown challenge: `/maze/not-a-challenge`;
- unknown or non-interview stage: `/interview/not-an-interview`;
- malformed or modified assignment: `/i/not-a-valid-assignment`;
- valid challenge in the wrong pack:
  `/maze/warehouse-first-orders`.

Route validation uses `findPack()` and `getChallenge()`. `getChallenge()` is strict
and returns `undefined` for an unknown ID. The legacy challenge-index helper
`findChallenge()` still has its editor fallback and must not be used to validate a
URL.

### URL ownership and navigation

The URL is the source of truth for the selected pack and challenge.

- World and directory cards are real Next links.
- The in-Studio challenge selector calls `router.push("/<pack>/<challenge>")`
  because it is already an interactive client component.
- The header links back to `/`; the Lab button goes to `/lab`.
- Studio is keyed by challenge route, resetting its transient engine and interval
  while restoring the persisted brain by challenge ID.
- Multi-problem interviews use `/i/[assignmentId]` as their directory and
  `/i/[assignmentId]/[challengeId]` for a selected problem. Legacy
  `?problem=n` links redirect to the matching nested route. Each
  assignment/problem pair receives an isolated local brain key.
- A selected interview problem keeps the normal challenge Studio layout. The
  usual problem-list control opens an interview-specific drawer containing
  assignment details and only the signed problem set, without normal world
  catalogue content.

`router.push`, rather than `replace`, is intentional: selecting a level should add
history so browser back/forward behaves as a learner expects. This corrects the
earlier planning note that suggested `replace` even though the route requirement
called for navigable history.

## File organization

The application is organized by ownership rather than by file type:

```text
app/                       route files, root layout and global CSS only
assets/                    source assets imported by components
features/
  landing/                 public site pages: home (/) = companies, education, login, 404
  engine/
    application/           shared page frame and application chrome
    catalogue/             discovery page UI, components and difficulty mapping
    lab/                   Lab page UI, JSON editor and workspace
    simulation/            cross-mode simulation presentation
    studio/                Studio page UI, persistence and authoring components
shared/
  components/              reusable cross-feature UI
content/
  worlds/                  immutable authored scenarios
  brains/
    default/ naive/ dash/
    warehouse/ supermarket/ finance/ parking/
  challenges/
    maze/                  Maze challenge descriptors
    warehouse/             Warehouse challenge descriptors
    finance/               Finance challenge descriptors
    parking/               Parking challenge descriptors
    index.ts               ordered bundled challenge registry
lib/
  engine/                   framework-independent runtime and world modules
  content/                  shared dataset and catalogue registries
  authoring/                compiler, persistence and objective evaluation
  curriculum/               progression graph
```

The ownership rules are:

- `app/` defines URLs; it does not own feature components.
- `features/` owns React components and client behavior for one product area.
- `shared/` is reserved for components that have no single feature owner.
- `content/` is authored data; `lib/content/` is the TypeScript API that exposes it.
- `lib/engine/` cannot import React, Next.js, `features/`, or `app/`.

## Component ownership and reuse

The directories describe ownership; they are not merely categories for similar
file extensions.

| Area | Public responsibility | Important reusable pieces |
|---|---|---|
| `features/landing/` | Owns the public site pages (`/` = companies, `/education`, `/login`, 404; `/companies` redirects to `/`) | `CompaniesPage`, `EducationPage`, `LoginPage`, `NotFoundPage`, `Nav`, `Footer`, `WaitlistForm`, `LiveSim` |
| `features/engine/application/` | Provides shared page chrome without route state | `PageLayout` |
| `features/engine/catalogue/` | Owns `/app` and `/[pack]` page UI | `WorldCataloguePage`, `ChallengeDirectoryPage`, `difficultyFor()` |
| `features/engine/lab/` | Owns `/lab` UI and Lab-only state | `LabPageView`, `BrainEditor` |
| `features/engine/simulation/` | Presents and constructs simulations for Studio and Lab | `createSimulationSession`, `SimControls`, `SimStage`, renderers |
| `features/engine/studio/` | Owns challenge-page UI, persistence and authoring state | `StudioPage`, `AuthoringPanel`, progression/results components and editor layers |
| `shared/components/` | Product-wide UI with no domain owner | `ThemeToggle` |

The intended dependency direction is:

```text
app routes
    ├──► catalogue pages
    ├──► StudioPage ─────► lib/authoring + lib/curriculum
    └──► LabPageView

catalogue + Lab ─────► application/PageLayout
StudioPage ──────────► Studio problem workspace chrome
Studio + Lab ────────► simulation ─► lib/engine
simulation ──────────► domain renderers
all UI features ─────► shared components
content registries ──► authored content
```

Rules for adding code:

1. A route `page.tsx` validates input and renders exactly one route-specific page
   UI component. It does not contain the page's Tailwind/JSX implementation.
2. Put a component in the feature that owns its behavior. A component used by
   two screens can still remain feature-owned when both uses concern that feature.
3. Promote a component to `shared/` only when no product feature is its natural
   owner.
4. Keep pure policy and mapping functions outside React components, as with
   `features/catalogue/difficulty.ts`.
5. Renderers consume the generic `World` contract and domain query helpers. They
   do not mutate the simulation.
6. `features/application/` contains stateless shared page chrome. It must not
   become another stateful route switch.
7. Catalogue and Lab sizing is expressed with Tailwind at the `PageLayout`
   call site; `PageLayout` does not translate semantic width props into
   container classes. Studio deliberately owns a full-viewport, independently
   scrolling two-pane desktop workspace instead of using the catalogue frame.
   Its Problem list drawer keeps only one pack-scoped solved fraction in the
   header; it does not repeat a level/done summary or visual progress track.

### Mechanical migration order

The migrations were performed and TypeScript-checked after each step:

1. `world/` → `content/worlds/`; central dataset and test imports updated.
2. All `brain*` directories → `content/brains/<name>/`; central dataset and test
   imports updated.
3. `challenges/` → `content/challenges/`; application, registry, curriculum and
   test imports updated.
4. The former `app/page.tsx` → `features/application/AppShell.tsx`; thin pages added.
5. UI moved out of `app/components/` into feature-owned folders.
6. `app/lib/datasets.ts` moved to `lib/content/datasets.ts` because world loading
   is shared by Studio, Lab, and engine tests.
7. Repeated application chrome became `ApplicationHeader`; the Lab view became
   `LabWorkspace`; catalogue difficulty mapping became a pure reusable module.
8. `AppShell` and `AppShellView` were removed. Home, directory, Studio, and Lab
   received dedicated page UI components; Studio and Lab received independent
   state and simulation lifecycles.
9. Single-use `WorldPicker`, `PackLevelPicker`, `LabWorkspace`,
   `ApplicationHeader`, and `HeaderAction` layers were folded into their owning
   page or shared layout.
10. Flat challenge JSON was grouped under pack-specific `maze/`, `warehouse/`,
    `finance/`, and `parking/` folders; the root registry preserves authored order.

## Verification

Completed locally:

- `npx tsc --noEmit` passes after the feature reorganization.
- `npm run lint` passes without warnings.
- `npm test` passes: **25 files, 152 tests**.
- `npm run build` passes.
- The static route pages compile under TypeScript with asynchronous dynamic params
  and server-side `notFound()` validation.
- Dependency-boundary checks confirm that `lib/engine/` imports no route, feature,
  shared UI, React, or Next.js code.
- Production client-reference manifests confirm route isolation: `/` and
  `/[pack]` include neither Studio nor Lab page clients; `/lab` references only
  `LabPage`, while `/[pack]/[challenge]` references `StudioPage`.
- Live production smoke checks return 200 for `/`, `/maze`,
  `/maze/branching-maze`, `/warehouse`, `/supermarket`, `/finance`, `/parking`, and `/lab`.
  The removed `/maze/open-arena` route correctly returns 404.

Manual browser smoke-test checklist for an environment where the dev server can
listen:

1. Open `/`, select Maze: `/maze` shows the challenge-row directory, with
   Examples as its only section heading, concise difficulty labels, and the
   Status/Skills/Difficulty/Subdomains filter sidebar. Use Back to return to the
   picker.
2. Open `/warehouse`, select First Orders: URL becomes
   `/warehouse/warehouse-first-orders`.
3. Paste that deep URL into a fresh tab: warehouse Studio opens with the persisted
   brain for that challenge.
4. Use Back/Forward between two challenge URLs: the correct challenge and saved
   brain load each time.
5. Open `/lab`: the raw world/brain JSON harness works independently of Studio.
6. Confirm the three invalid-path examples above render the Next not-found page.

These remain useful manual interaction checks even though representative
production routes were verified automatically.

For the full explanation of engine decoupling, modules, registries, and challenge
loading, see [ARCHITECTURE.md](./ARCHITECTURE.md).
