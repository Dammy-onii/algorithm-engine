# Page Routing & File Structure

Implemented reference for the routing and content-layout refactor. The work keeps
the previous stateful Studio/Lab logic intact by extracting it into a shared client
shell instead of rewriting it.

## Routes

| URL | Server-route responsibility | Client view |
|---|---|---|
| `/` | none | World/pack picker |
| `/[pack]` | Validate the pack | That world's level directory, grouped by difficulty |
| `/[pack]/[challenge]` | Validate pack, challenge, and membership | Shareable Studio challenge |
| `/lab` | none | Raw JSON Engine Lab |

Examples: `/maze`, `/warehouse`, and
`/warehouse/warehouse-first-delivery`.

### Route implementation

```text
app/
  page.tsx                        <AppShell view="home" />
  [pack]/page.tsx                 validates findPack(pack)
  [pack]/[challenge]/page.tsx     validates findPack + getChallenge + membership
  lab/page.tsx                    <AppShell view="lab" />
  components/AppShell.tsx         timers, Studio, Lab, persistence and controls
```

The dynamic route pages are server components. In this version of Next's App
Router, their `params` prop is a promise, so pages await it before validation.
Invalid URLs call `notFound()`:

- unknown pack: `/not-a-pack`;
- unknown challenge: `/maze/not-a-challenge`;
- valid challenge in the wrong pack:
  `/maze/warehouse-first-delivery`.

Route validation uses `findPack()` and `getChallenge()`. `getChallenge()` is strict
and returns `undefined` for an unknown ID. The legacy challenge-index helper
`findChallenge()` still has its editor fallback and must not be used to validate a
URL.

### URL ownership and navigation

The URL is the source of truth for the selected pack and challenge.

- The world picker calls `router.push("/<pack>")`.
- The world-level directory and in-Studio challenge selector call
  `router.push("/<pack>/<challenge>")`.
- The header links back to `/`; the Lab button goes to `/lab`.
- A route-specific `key` on `AppShell` intentionally resets transient state
  (active interval, current simulation engine, ephemeral objective panel) after a
  navigation. The persisted visual brain is then restored from `localStorage` by
  challenge ID.

`router.push`, rather than `replace`, is intentional: selecting a level should add
history so browser back/forward behaves as a learner expects. This corrects the
earlier planning note that suggested `replace` even though the route requirement
called for navigable history.

## File organization

Authored data is now grouped under `content/`:

```text
content/
  worlds/                 formerly world/
  brains/
    default/               formerly brain/
    naive/                 formerly brain-naive/
    dash/                  formerly brain-dash/
    warehouse/             formerly brain-warehouse/
  challenges/             formerly challenges/
lib/
  engine/                 runtime and shipped world modules
  content/                catalog API (not authored data)
  authoring/  curriculum/
app/
  components/             AppShell, simulator and Studio UI
  [pack]/  lab/           route segments
```

The apparent `content` naming overlap is deliberate:

- `content/` at the repository root is authored JSON content, bundled today.
- `lib/content/` is TypeScript that exposes that content through a stable catalog
  API (`listPacks`, `findPack`, `challengesInPack`, `getChallenge`).

### Mechanical migration order

The migration was performed and TypeScript-checked after each step:

1. `world/` → `content/worlds/`; central dataset and test imports updated.
2. All `brain*` directories → `content/brains/<name>/`; central dataset and test
   imports updated.
3. `challenges/` → `content/challenges/`; application, registry, curriculum and
   test imports updated.
4. The former `app/page.tsx` → `app/components/AppShell.tsx`; thin pages added.

## Verification

Completed locally:

- `npx tsc --noEmit` passes after the content moves and route extraction.
- `npm run lint` passes.
- `npm test` passes: **8 files, 62 tests**.
- The static route pages compile under TypeScript with asynchronous dynamic params
  and server-side `notFound()` validation.

The production build was also attempted. It reaches Next's configured Google-font
download but cannot complete in this sandbox because access to
`fonts.googleapis.com` is blocked; the requested networked build approval timed
out. This is external font fetching, not a routing or TypeScript failure.

Manual browser smoke-test checklist for an environment where the dev server can
listen:

1. Open `/`, select Maze: `/maze` shows the level directory and its difficulty
   constraints. Use Back to return to the picker.
2. Open `/warehouse`, select First Delivery: URL becomes
   `/warehouse/warehouse-first-delivery`.
3. Paste that deep URL into a fresh tab: warehouse Studio opens with the persisted
   brain for that challenge.
4. Use Back/Forward between two challenge URLs: the correct challenge and saved
   brain load each time.
5. Open `/lab`: the raw world/brain JSON harness works independently of Studio.
6. Confirm the three invalid-path examples above render the Next not-found page.

The sandbox prevents binding a local dev server (`listen EPERM`), so those browser
steps are explicitly listed rather than claimed as completed.

For the full explanation of engine decoupling, modules, registries, and challenge
loading, see [ARCHITECTURE.md](./ARCHITECTURE.md).
