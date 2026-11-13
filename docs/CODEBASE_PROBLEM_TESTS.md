# Code Problems — Tests

What the tests in the `/app/code` problems check, how they run, how the responsive
problem's layout tests work, and how all of it was verified. The problems themselves
are described in [CODEBASE_ASSESSMENTS.md](./CODEBASE_ASSESSMENTS.md).

There are two kinds of test:

| Kind | Where it runs | What it checks |
|---|---|---|
| **Problem tests** (visible to the learner) | In the learner's browser, inside Sandpack's Jest runner (jsdom), when **▶ Run tests** is pressed | Whether the learner's code is correct |
| **CTRL unit tests** | `npx vitest run`, in this repo | That the problem definitions, brief parser and assessment service are well formed |

The CTRL unit tests cannot run the problem tests (those need Sandpack). The problem
tests were verified in a real browser; see [Verification](#verification).

## How problem tests run

- Each problem ships its tests as ordinary files (`*.test.js`), visible in the editor.
  The React problems use the standard React app layout, so their tests sit in `src/`
  next to the code they test (for example `src/utils/cart.test.js`).
- **▶ Run tests** (next to the Tests heading) sends the current files to Sandpack's
  test frame, which runs Jest with jsdom (a simulated DOM, no real layout). Tests never
  run on their own.
- The button waits for the latest edit to compile, waits for the runner to be free, and
  re-runs once if the runner reloads mid-run. Details in
  [CODEBASE_ASSESSMENTS.md → known limits](./CODEBASE_ASSESSMENTS.md#known-limits-v1).
- What a test file can use (checked in the browser): JSX in React projects,
  `react-dom/server` (`renderToStaticMarkup`), CSS imported by the code under test (its
  rules, `@media` included, appear in `document.styleSheets`), and
  `import text from "!raw-loader!./file"` to read any project file as text.
- Plain-JS projects run on the Create React App bundler so modern syntax (`??`, `?.`,
  class fields) works in tests. See
  [CODEBASE_ASSESSMENT_RUNTIMES.md](./CODEBASE_ASSESSMENT_RUNTIMES.md#how-the-workspace-uses-an-adapter).

## The tests in each problem

"Starter" is the result on the starting code; "fixed" is the result on a correct fix,
run straight after typing it (measured in the browser).

### Fix the cart total (easy, React app): `src/utils/cart.test.js`

| Test | Checks |
|---|---|
| formats prices with two decimals | `formatPrice(4.5)` is `"$4.50"` |
| totals a single line | one line of price 10, quantity 1 totals 10 |
| multiplies price by quantity | price 10, quantity 3 totals 30 (the bug) |

Starter: 1 failed, 2 passed. Fixed: 3 passed.

### Fix the word counter (easy, JavaScript): `counter.test.js`

| Test | Checks |
|---|---|
| counts simple sentences | `"hello brave world"` is 3 |
| ignores repeated spaces | `"hello    world"` is 2 |
| handles new lines and tabs | `"a\nb\tc"` is 3 |
| blank text is zero words | `""` and `"   "` are 0 |

Starter: 3 failed, 1 passed. Fixed: 4 passed.

### Order history pagination (medium, React app): `src/utils/paginate.test.js`

| Test | Checks |
|---|---|
| page 1 returns the most recent orders first | page numbering starts at 1 and sorts newest `createdAt` first |
| limit defaults to 10 | `paginate(orders, 1)` uses 10 |
| limit is capped at 50 | a limit of 500 returns 50 |
| returns items, page, limit and total | the result shape, with `total` across all pages |
| a page past the end is empty | page 9 of 25 orders has no items |

Starter: 4 failed, 1 passed. Fixed: 5 passed.

### The wrong product gets added (medium, React app): `src/utils/cart.test.js`

| Test | Checks |
|---|---|
| adds the product with the clicked id | looks up by `id`, not array position |
| works on a filtered list | still correct after `searchProducts` filters the list |
| adding twice increases the quantity | a second add raises quantity to 2 |
| does not change the cart it was given | the input cart isn't mutated |
| ignores an unknown product id | id 99 leaves the cart empty |
| search ignores letter case | `"WATER"` finds Water Bottle |

Starter: 4 failed, 2 passed. Fixed: 6 passed.

### Checkout must be all or nothing (hard, JavaScript): `checkout.test.js`

| Test | Checks |
|---|---|
| a good checkout creates a paid order, an invoice and lowers stock | the success path: `201`, order `paid`, invoice total, stock reduced |
| if any line fails, nothing is written | a failing second line returns `409` and leaves stock, orders and invoices untouched |
| rejects bad quantities with 400 and changes nothing | `0`, `-1` and `1.5` each return `400` with stock unchanged |
| repeated lines for one product are added up before checking stock | two lines of 1 notebook (stock 1) return `409` |

Starter: 3 failed, 1 passed. Fixed: 4 passed.

### Make the storefront responsive (medium, React app): `src/responsive.test.js`

The page is styled only with Tailwind classes. Each part of the page is found by its
`data-section` attribute (`page`, `header`, `nav`, `hero`, `hero-text`, `hero-art`,
`grid`, `footer`), so learners must keep those attributes.

| Group | Test | Passes when |
|---|---|---|
| setup | public/index.html has a viewport meta tag | `<meta name="viewport">` contains `width=device-width` and `initial-scale=1` (read with `!raw-loader!../public/index.html`) |
| phone (375px) | nothing has a fixed width wider than the screen | no visible element has a `width` or `min-width` over 375px (elements hidden at that width are skipped) |
| phone | the header has no fixed height, so it can grow when links wrap | the header's `height` isn't a fixed length |
| phone | nav links wrap or stack instead of running off the screen | the nav wraps, is a column, is a grid, scrolls sideways, or is hidden behind a `button[aria-expanded]` in the header |
| phone | the hero stacks the text above the picture | the hero is a flex column, a one-column grid, or block |
| phone | the main heading is 36px or smaller (or scales with the screen) | the `h1` size is at most 36px, or uses `clamp()`, `min()` or `vw` |
| phone | products are in one column | the product grid has 1 column |
| phone | the footer is in one column | the footer grid has 1 column |
| tablet (768px) | products are in two columns | the product grid has 2 columns |
| desktop (1200px) | products are in three columns | 3 columns (stops a "phone-only" rewrite) |
| desktop | the footer is in three columns | 3 columns |
| desktop | the hero text sits beside the picture | the hero is not stacked |

Starter: 9 failed, 3 passed (only the desktop tests pass).

#### How the layout tests work: `src/test-utils/layout.js`

jsdom has no layout engine and doesn't apply media queries, and Tailwind doesn't run
inside the tests, so nothing can be measured. Instead the helper, shipped in the
project, works out the styles an element would have at a given screen width:

1. **Tailwind classes.** It reads the element's `class` attribute and, for each class:
   - splits off the prefixes (`md:`, `lg:max-w-xl`, `max-md:`, `min-[900px]:`) and keeps
     the class only if every prefix matches the width. Breakpoints are Tailwind's
     defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536. `max-*` applies
     below a breakpoint. State prefixes (`hover:`, `focus:`, `dark:`) never match;
   - turns the class into CSS using Tailwind v4's default scale: spacing is 4px per step
     (`h-18` is 72px), container sizes for `max-w-*` (`max-w-6xl` is 1152px), text sizes
     (`text-4xl` is 36px, `text-6xl` 60px), fractions (`w-1/2`), keywords (`w-full`,
     `w-screen`), and arbitrary values with `_` read as a space
     (`grid-cols-[repeat(auto-fit,minmax(300px,1fr))]`);
   - applies classes mobile-first: unprefixed first, then larger breakpoints.

   Utilities it understands: `flex`, `inline-flex`, `grid`, `block`, `hidden`, …;
   `flex-row`/`flex-col` (and `-reverse`); `flex-wrap`/`flex-nowrap`; `grid-cols-*`;
   `w-*`, `h-*`, `min-w-*`, `max-w-*`, `min-h-*`, `max-h-*`, `size-*`; `p-*`, `px-*`,
   `pl-*`, `pr-*`; `gap-*`, `gap-x-*`; `text-<size>`; `overflow-*`, `overflow-x-*`.
   Other classes (colours, borders, shadows) are ignored.
2. **Ordinary CSS.** It also reads any stylesheets the page loaded, keeps rules whose
   media queries match the width (`min-width`, `max-width` and range syntax such as
   `(width >= 48rem)`), and applies the cascade: specificity, source order,
   `!important` and inline `style`.

   The merge order is CSS rules, then Tailwind classes, then inline styles, then
   `!important` rules. Real Tailwind v4 puts utilities in a cascade layer, so
   unlayered CSS would win in a browser; this only matters if a learner mixes CSS
   files and conflicting classes.
3. **Layout helpers** used by the tests:
   - `styleAt(el, width)`: the resulting property map;
   - `isHidden(el, width)`: `display: none` on the element or a parent;
   - `columnsAt(el, width)`: grid column count. It counts tracks in
     `grid-template-columns`, expanding `repeat(n, …)`. For `repeat(auto-fit|auto-fill,
     minmax(min, …))` it estimates the available width (screen width, narrowed by
     fixed widths, `max-width` and horizontal padding down the parent chain) and
     computes how many tracks fit, gaps included. A flex column counts as 1;
   - `isStacked(el, width)`: a flex column, a one-column grid, or a block;
   - `lengthPx(value, width)`: px from `px`, `rem`/`em` (16px), `%`/`vw` (of the screen
     width), and `min()`/`max()`.

**Known approximations:**
- Percentages are measured against the screen width, not the parent. This is close
  enough for page-level layout.
- A product grid built with flex-wrap returns no column count, so the brief asks to keep
  grids.
- The tests check the classes and rules, not pixels. Overlapping text or tiny tap
  targets pass, which is why the brief's Task 3 asks for a visual check with the preview
  size buttons.

## Hidden tests (company flow)

The example projects offered when a company creates an assessment
(`lib/assessment/runtime/examples.ts`) also have hidden tests, which are never sent to
the candidate:

- cart: an empty cart is 0; `0.1 × 3` is exactly `0.3` (floating-point drift); a missing
  quantity counts as 1;
- word counter: an empty string is 0 words; new lines and tabs separate words.

There is no hidden-test runner yet; see
[CODEBASE_ASSESSMENT_API.md](./CODEBASE_ASSESSMENT_API.md#hidden-test-runner).

## CTRL unit tests (`lib/assessment/__tests__/`)

| File | Covers |
|---|---|
| `problems.test.ts` | Problem ids are unique with a registered runtime; each has a brief, a summary, a visible test file and its entry file; every level is covered; lookup by id |
| `markdown.test.ts` | The brief parser: headings, lists, quotes, paragraphs, code fences, inline code and bold; two quotes separated by a blank line stay separate |
| `files.test.ts` | Path normalising (rejects traversal, backslashes, nulls), file-map validation (text only, size limits), folder upload (shared root stripped, junk skipped with a reason), diffs, replay at any snapshot, line diffs |
| `service.test.ts` | Signed link tokens (tampering and wrong kind rejected); authoring validation; hidden tests never sent to candidates; one attempt per link with resume by session id; snapshots stored as diffs with run counts; the time limit (autosave refused after it, late submit accepted and flagged); a failing hidden-test runner reported as an error, not a lost submission; reviews validated against the rubric |

Run with `npx vitest run lib/assessment`.

## Verification

The problem tests can only run in Sandpack, so they were verified in headless Chrome
(Playwright) against the dev server. The scripts are not in the repo. To repeat a check
by hand or in a script:

1. **Starter and fix.** Open `/app/code/<id>`, press **▶ Run tests**, and confirm the
   starter results above. Paste the correct fix and press **▶ Run tests** straight away:
   all tests should pass. Reload and run again: still all pass (saved work is restored).
2. **Seeding a version without typing.** Saved work lives in local storage under
   `ctrl-code:<id>` as a JSON map of path to source (React problems use `src/` paths,
   e.g. `/src/App.js`). Write a modified map before the page
   loads (for example with Playwright's `addInitScript`) and reload. It is applied after
   the first bundle.
3. **Responsive problem.** Seed each version below, run the tests, then use the
   **Phone / Tablet / Desktop** preview buttons and, in the preview frame, compare
   `document.documentElement.scrollWidth` with `innerWidth` (sideways scrolling) and count
   the grid's computed `grid-template-columns`:

   | Version | Tests | Real browser |
   |---|---|---|
   | Starter | 3/12 (desktop only) | 1100px page on phone and tablet: sideways scrolling |
   | Breakpoint solution (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `max-w-[1100px]`, `lg:` widths) | 12/12 | fits; 1 / 2 / 3 columns |
   | Fluid solution (arbitrary `auto-fit`/`minmax`, `text-[clamp(..)]`, `w-[min(..)]`) | 12/12 | fits; 1 / 2 / 3 columns |
   | Menu-button solution (`hidden md:flex` nav and a `button[aria-expanded]`) | 12/12 | fits; 1 / 2 / 3 columns |
   | Half fix (fixed page width and side-by-side hero left in) | 10/12 | still scrolls sideways |

4. **Edits survive re-renders.** Type a fix, click **Phone 375** then **Fit**, and
   check the editor still has the fix and the tests pass (this used to reset the
   project; see the CHANGELOG).
5. **Modern syntax (plain-JS projects).** A test using `??`, `?.`, `??=`, class fields
   and `1_000` passes in both stacks.

A real-browser test suite for CTRL itself (Playwright in the repo) would make these
checks permanent. It isn't set up yet.
