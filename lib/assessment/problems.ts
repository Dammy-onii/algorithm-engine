import { cartAppFiles, paginationAppFiles, searchAppFiles } from "./reactApp";
import { responsiveFiles } from "./responsiveProblem";
import { vanillaExample } from "./runtime/examples";
import type { FileMap } from "./types";

/**
 * Example code problems listed in /app. Each is a small real-looking project with a
 * fault to find and fix, plus visible tests the learner can run in the browser.
 * (Company-authored assessments with hidden tests live behind a flag; see
 * docs/CODEBASE_ASSESSMENTS.md.)
 */
export type ProblemLevel = "easy" | "medium" | "hard";

export interface CodeProblem {
  id: string;
  title: string;
  level: ProblemLevel;
  runtimeId: "react-app" | "vanilla-js";
  /** One or two lines for the list card. */
  summary: string;
  /** Shown in the brief panel (Markdown subset). */
  scenario: string;
  files: FileMap;
  /** File opened first. Defaults to the runtime's entry file. */
  openFile?: string;
  /** Files shown as editor tabs. Defaults to every project file; all files stay in the explorer. */
  tabs?: string[];
}

const counter = vanillaExample();

const checkoutFiles: FileMap = {
  "/index.html": `<!DOCTYPE html>
<html>
  <body style="font-family: system-ui; padding: 24px">
    <h1>Checkout</h1>
    <pre id="out"></pre>
    <script src="index.js"></script>
  </body>
</html>
`,
  "/index.js": `import { checkout } from "./checkout";
import { createStore } from "./store";

const store = createStore();
const result = checkout(store, [
  { productId: 1, quantity: 2 },
  { productId: 2, quantity: 1 },
]);

document.getElementById("out").textContent =
  JSON.stringify({ result, stock: store.products.map((p) => [p.name, p.stock]) }, null, 2);
`,
  "/store.js": `export function createStore() {
  return {
    products: [
      { id: 1, name: "Water Bottle", priceCents: 1200, stock: 5 },
      { id: 2, name: "Notebook", priceCents: 450, stock: 1 },
    ],
    orders: [],
    invoices: [],
  };
}
`,
  "/checkout.js": `// POST /api/checkout. Support reports orders failing halfway: stock is gone but there is no order.
export function checkout(store, items) {
  const order = { id: store.orders.length + 1, status: "paid", items: [], totalCents: 0 };

  for (const { productId, quantity } of items) {
    const product = store.products.find((p) => p.id === productId);
    if (!product || product.stock < quantity) {
      return { ok: false, status: 409, error: "Out of stock" };
    }
    product.stock -= quantity;
    order.items.push({ productId, quantity });
    order.totalCents += product.priceCents * quantity;
  }

  store.orders.push(order);
  store.invoices.push({ orderId: order.id, totalCents: order.totalCents });
  return { ok: true, status: 201, order };
}
`,
  "/checkout.test.js": `import { checkout } from "./checkout";
import { createStore } from "./store";

test("a good checkout creates a paid order, an invoice and lowers stock", () => {
  const store = createStore();
  const result = checkout(store, [{ productId: 1, quantity: 2 }]);
  expect(result.status).toBe(201);
  expect(store.orders).toHaveLength(1);
  expect(store.orders[0].status).toBe("paid");
  expect(store.invoices).toEqual([{ orderId: 1, totalCents: 2400 }]);
  expect(store.products[0].stock).toBe(3);
});

test("if any line fails, nothing is written", () => {
  const store = createStore();
  const result = checkout(store, [
    { productId: 1, quantity: 2 },
    { productId: 2, quantity: 5 },
  ]);
  expect(result.status).toBe(409);
  expect(store.products.map((p) => p.stock)).toEqual([5, 1]);
  expect(store.orders).toHaveLength(0);
  expect(store.invoices).toHaveLength(0);
});

test("rejects bad quantities with 400 and changes nothing", () => {
  for (const quantity of [0, -1, 1.5]) {
    const store = createStore();
    expect(checkout(store, [{ productId: 1, quantity }]).status).toBe(400);
    expect(store.products[0].stock).toBe(5);
  }
});

test("repeated lines for one product are added up before checking stock", () => {
  const store = createStore();
  const result = checkout(store, [
    { productId: 2, quantity: 1 },
    { productId: 2, quantity: 1 },
  ]);
  expect(result.status).toBe(409);
  expect(store.products[1].stock).toBe(1);
});
`,
};

/** Joins brief sections (arrays of lines) into one Markdown-subset string. */
const brief = (...sections: string[][]) => sections.map((lines) => lines.join("\n")).join("\n\n");

/** How the workspace works. The same for every practice problem. */
const HOW_TO_CHECK = [
  "# How to check your work",
  "",
  "- **Tests:** press **▶ Run tests** next to the Tests heading in the bottom panel. They don't re-run on their own, so run them again after each change. **PASS** means every visible test passed.",
  "- **Preview:** the bottom-left panel shows the running app and rebuilds as you type. Use **Open in new tab** above it, or **Copy link** and paste it into a new tab, to see it full size. That tab follows your edits.",
  "- Your work is saved in this browser. **Reset** (top right) puts the starting code back.",
];

const REACT_SETUP =
  "- `package.json`, `public/index.html`, `src/index.js` and `src/index.css`: the standard React app setup. `src/index.js` starts the app and loads Tailwind CSS, and `src/index.css` holds the global styles. You don't need to change these.";

/** File tree lines for a React problem: the standard layout plus the problem's own src/ files. */
const reactTree = (...srcLines: string[]) => [
  "```",
  "package.json",
  "public/",
  "  index.html",
  "src/",
  "  index.js",
  "  index.css",
  "  App.js",
  "  App.css",
  ...srcLines.map((line) => "  " + line),
  "```",
];
const VANILLA_SETUP = "- `styles.css`, `package.json`: project setup. You don't need to change these.";

export const CODE_PROBLEMS: readonly CodeProblem[] = [
  {
    id: "cart-total",
    title: "Fix the cart total",
    level: "easy",
    runtimeId: "react-app",
    summary: "Customers say the total at checkout is too low. Find the bug in a small React cart.",
    scenario: brief(
      [
        "# The situation",
        "",
        "You have just joined the engineering team at a small online shop that sells stationery and desk accessories. The cart page is live, and this week support has received several complaints that the total at checkout doesn't add up.",
        "",
        "One customer has 3 notebooks ($4.50 each), 1 pen set ($12.00) and 2 desk lamps ($29.99 each). Their items are worth **$85.48**, but the cart shows **$46.49**. Every under-charged order loses the shop money, so this is your first priority.",
        "",
        "> \"The total at checkout is lower than what I added to my cart.\"",
      ],
      [
        "# Your tasks",
        "",
        "## Task 1: Fix the cart total",
        "",
        "- Find out why `cartTotal` in `src/utils/cart.js` returns the wrong number, and fix it.",
        "- Each line costs its price times its quantity. The total is the sum of all lines.",
        "- Make every test in `src/utils/cart.test.js` pass, and check that the preview shows **Total: $85.48**.",
        "- The item lines show the price of one unit (for example `Desk lamp x2: $29.99`). That is intended and doesn't need to change.",
        "",
        "## Task 2: Review your own change",
        "",
        "Above your fix, add a short comment saying what else you would check before shipping it. Think about unusual carts a real customer could have.",
      ],
      [
        "# Project files",
        "",
        ...reactTree("components/", "  CartSummary.js", "utils/", "  cart.js", "  cart.test.js"),
        "",
        "- `src/App.js`: the cart page. It holds the sample cart (three items) and renders the summary.",
        "- `src/App.css`: one custom rule that keeps price digits lined up. Everything else is styled with Tailwind classes.",
        "- `src/components/CartSummary.js`: lists each item and shows the total, using the helpers in `src/utils/cart.js`.",
        "- `src/utils/cart.js`: the cart maths. `formatPrice` turns a number into `$0.00` text and `cartTotal` adds up the cart.",
        "- `src/utils/cart.test.js`: the tests for `src/utils/cart.js`.",
        REACT_SETUP,
      ],
      HOW_TO_CHECK,
    ),
    files: cartAppFiles,
    openFile: "/src/utils/cart.js",
    tabs: ["/src/utils/cart.js", "/src/utils/cart.test.js", "/src/components/CartSummary.js", "/src/App.js", "/src/App.css"],
  },
  {
    id: "word-counter",
    title: "Fix the word counter",
    level: "easy",
    runtimeId: "vanilla-js",
    summary: "A word counter miscounts text with extra spaces and new lines.",
    scenario: brief(
      [
        "# The situation",
        "",
        "You work on a small writing tool that students use to check their essays against word limits. The page has a text box and a live word count underneath it, written in plain JavaScript (no framework).",
        "",
        "Students have noticed that the count jumps when they type two spaces in a row, paste text with line breaks, or indent with tabs, and that an empty box says **1** word. Some have been told their essay is over the limit when it isn't.",
        "",
        "> \"My essay is 498 words in my word processor but your counter says 530. And when the box is empty it says 1.\"",
      ],
      [
        "# Your tasks",
        "",
        "## Task 1: Count words correctly",
        "",
        "Fix `countWords` in `counter.js` so that:",
        "",
        "- A word is any run of characters that are not spaces, tabs or new lines.",
        "- Several spaces, tabs or new lines between words count as one gap.",
        "- Spaces at the start or end of the text don't add words.",
        "- Empty or blank text has **0** words.",
        "",
        "Make every test in `counter.test.js` pass.",
        "",
        "## Task 2: Try it by hand",
        "",
        "Type in the preview: try double spaces, a line break, and clearing the box. The count should match what you'd count yourself.",
      ],
      [
        "# Project files",
        "",
        "```",
        "index.html",
        "index.js",
        "counter.js",
        "counter.test.js",
        "```",
        "",
        "- `index.html`: the page: a text box (`#input`) and the count (`#count`).",
        "- `index.js`: connects the two. Every time the text changes it calls `countWords` and shows the result.",
        "- `counter.js`: `countWords(text)`, the logic you are fixing.",
        "- `counter.test.js`: the tests for `countWords`.",
        VANILLA_SETUP,
      ],
      HOW_TO_CHECK,
    ),
    files: {
      ...counter.files,
      "/counter.test.js": `import { countWords } from "./counter";

test("counts simple sentences", () => {
  expect(countWords("hello brave world")).toBe(3);
});

test("ignores repeated spaces", () => {
  expect(countWords("hello    world")).toBe(2);
});

test("handles new lines and tabs", () => {
  expect(countWords("a\\nb\\tc")).toBe(3);
});

test("blank text is zero words", () => {
  expect(countWords("")).toBe(0);
  expect(countWords("   ")).toBe(0);
});
`,
    },
  },
  {
    id: "order-history-pagination",
    title: "Order history pagination",
    level: "medium",
    runtimeId: "react-app",
    summary: "Page 1 skips the newest orders, the Next button never stops, and page sizes aren't capped.",
    scenario: brief(
      [
        "# The situation",
        "",
        "You own the **My orders** page of an online shop. It lists a customer's past orders five at a time, with Previous and Next buttons. The list comes from a small helper, `paginate`, which the backend team also plans to reuse for the orders API, where callers choose their own page size.",
        "",
        "Two reports have landed on your desk:",
        "",
        "> \"Page 1 of my order history doesn't show my most recent orders. I have to click Next several times to find what I bought yesterday, and Next never greys out, even after the last order.\"",
        "",
        "> From the backend lead: \"If someone asks for 10,000 orders per page, `paginate` will happily return them all. That has to be capped before we reuse it in the API.\"",
      ],
      [
        "# Your tasks",
        "",
        "## Task 1: Fix `paginate`",
        "",
        "Fix `paginate(items, page, limit)` in `src/utils/paginate.js` so that:",
        "",
        "- Pages are numbered from 1, and page 1 holds the **most recent** orders (newest `createdAt` first).",
        "- The array passed in is not reordered. Sort a copy.",
        "- `limit` is 10 when it isn't given, and never more than 50. Use the `DEFAULT_LIMIT` and `MAX_LIMIT` constants.",
        "- The result is `{ items, page, limit, total }`, where `total` is the number of orders across all pages.",
        "- A page past the end has an empty `items` list.",
        "",
        "Make every test in `src/utils/paginate.test.js` pass.",
        "",
        "## Task 2: Check the page",
        "",
        "In the preview, page 1 should start with **Order #23** (the newest). Next and Previous should walk through all 23 orders, and Next should be disabled on the last page (page 5).",
      ],
      [
        "# Project files",
        "",
        ...reactTree("data/", "  orders.js", "utils/", "  paginate.js", "  paginate.test.js"),
        "",
        "- `src/App.js`: the My orders page. It keeps the current page number, asks `paginate` for 5 orders at a time and uses `total` to decide when Next is disabled.",
        "- `src/App.css`: one custom rule that keeps order numbers lined up. Everything else is styled with Tailwind classes.",
        "- `src/data/orders.js`: 23 sample orders, each with an `id` and a `createdAt` timestamp. A higher id is a more recent order.",
        "- `src/utils/paginate.js`: the paging helper and its `DEFAULT_LIMIT` / `MAX_LIMIT` constants.",
        "- `src/utils/paginate.test.js`: the tests for `paginate`.",
        REACT_SETUP,
      ],
      HOW_TO_CHECK,
    ),
    files: paginationAppFiles,
    openFile: "/src/utils/paginate.js",
    tabs: ["/src/utils/paginate.js", "/src/utils/paginate.test.js", "/src/App.js", "/src/data/orders.js", "/src/App.css"],
  },
  {
    id: "wrong-product-in-cart",
    title: "The wrong product gets added",
    level: "medium",
    runtimeId: "react-app",
    summary: "Search for a product, click Add to cart, and a different one lands in the cart.",
    scenario: brief(
      [
        "# The situation",
        "",
        "You work on the storefront of a shop that sells travel and office gear. Customers can search the product list and add items to their cart. Since search shipped, support has seen a stream of returns for items people say they never chose, and complaints that search misses obvious matches.",
        "",
        "> \"I searched for 'Backpack', clicked Add to cart, and a Water Bottle was added instead.\"",
        "",
        "> \"Typing 'water' finds nothing, but 'Water' works.\"",
      ],
      [
        "# Your tasks",
        "",
        "## Task 1: Fix Add to cart",
        "",
        "Fix `addToCart(cart, products, productId)` in `src/utils/cart.js` so that:",
        "",
        "- It adds the product whose `id` is `productId`, whether or not the product list has been filtered by a search.",
        "- Adding a product that is already in the cart increases its quantity by 1.",
        "- It returns a **new** cart and leaves the cart it was given (and its lines) unchanged. React only re-renders when it gets a new array.",
        "- An unknown id leaves the cart as it was.",
        "",
        "## Task 2: Fix search",
        "",
        "`searchProducts` must ignore letter case: `water`, `WATER` and `Water` all find **Water Bottle**.",
        "",
        "Make every test in `src/utils/cart.test.js` pass.",
        "",
        "## Task 3: Check the page",
        "",
        "In the preview, search for `back` and add the Backpack twice. The cart should show **Backpack x2** and nothing else.",
      ],
      [
        "# Project files",
        "",
        ...reactTree("data/", "  products.js", "utils/", "  cart.js", "  cart.test.js"),
        "",
        "- `src/App.js`: the shop page. It holds the search text and the cart, shows the matching products with an Add to cart button each, and lists the cart.",
        "- `src/App.css`: the two-column layout (products beside the cart on wider screens). Everything else is styled with Tailwind classes.",
        "- `src/data/products.js`: the four products for sale, each with an `id` and a `name`.",
        "- `src/utils/cart.js`: `searchProducts` (filters products by name) and `addToCart` (returns the cart with a product added).",
        "- `src/utils/cart.test.js`: the tests for both helpers.",
        REACT_SETUP,
      ],
      HOW_TO_CHECK,
    ),
    files: searchAppFiles,
    openFile: "/src/utils/cart.js",
    tabs: ["/src/utils/cart.js", "/src/utils/cart.test.js", "/src/App.js", "/src/data/products.js", "/src/App.css"],
  },
  {
    id: "checkout-all-or-nothing",
    title: "Checkout must be all or nothing",
    level: "hard",
    runtimeId: "vanilla-js",
    summary: "A failed checkout leaves stock reduced but no order. Make it atomic and validate input.",
    scenario: brief(
      [
        "# The situation",
        "",
        "You are on the backend team of an online shop. The `checkout` function handles `POST /api/checkout`: it takes the lines of a customer's cart, reduces stock, creates a paid order and writes an invoice. So you can run it in the browser, the database here is a plain in-memory `store` object.",
        "",
        "Support and finance have both escalated problems:",
        "",
        "> \"The customer was told their checkout failed, but the water bottles they ordered are now out of stock and there's no order on their account.\"",
        "",
        "> \"We found an order for 1.5 notebooks, and one for -2 water bottles that increased our stock.\"",
        "",
        "The current code changes stock line by line and gives up as soon as a later line fails, so earlier changes are left behind. It also never checks the quantities it is given.",
      ],
      [
        "# Your tasks",
        "",
        "## Task 1: Make checkout all or nothing",
        "",
        "A successful checkout returns status `201` and creates all of:",
        "",
        "- an order with status `paid`",
        "- a stock decrease for each product",
        "- an invoice `{ orderId, totalCents }` with the order total",
        "",
        "If **any** line can't be fulfilled (unknown product or not enough stock), return `409` and leave stock, orders and invoices exactly as they were.",
        "",
        "## Task 2: Validate the input",
        "",
        "- A quantity that is not a positive whole number (`0`, `-1`, `1.5`) returns `400` and changes nothing.",
        "- Lines for the same product are added together before checking stock. Two lines of 1 notebook need 2 in stock.",
        "",
        "Keep the result shape: `{ ok: true, status, order }` on success and `{ ok: false, status, error }` on failure. Make every test in `checkout.test.js` pass.",
        "",
        "## Task 3: Explain",
        "",
        "At the top of `checkout`, add a short comment on how your version stays safe, and what would change with a real database where two checkouts can run at the same time.",
      ],
      [
        "# Project files",
        "",
        "```",
        "index.html",
        "index.js",
        "store.js",
        "checkout.js",
        "checkout.test.js",
        "```",
        "",
        "- `store.js`: `createStore()` returns a fresh in-memory database: `products` (with `priceCents` and `stock`), `orders` and `invoices`.",
        "- `checkout.js`: the `checkout(store, items)` handler you are fixing.",
        "- `index.js`: runs one sample checkout (2 Water Bottles and 1 Notebook) and prints the result and the remaining stock.",
        "- `index.html`: the page `index.js` prints into (`#out`).",
        "- `checkout.test.js`: the tests for `checkout`. Each test starts from a fresh store.",
        VANILLA_SETUP,
      ],
      HOW_TO_CHECK,
    ),
    files: checkoutFiles,
  },
  {
    id: "responsive-storefront",
    title: "Make the storefront responsive",
    level: "medium",
    runtimeId: "react-app",
    summary: "A Tailwind shop page that only works on a laptop. Make it fit phones and tablets without breaking desktop.",
    scenario: brief(
      [
        "# The situation",
        "",
        "You are the front-end developer at **Northdesk**, a small company that sells desks, lamps and bags online. The storefront was built by an agency that only ever looked at it on a laptop.",
        "",
        "Most visitors now arrive on their phones, and most of them leave within seconds. On a phone the page is wider than the screen, so people have to scroll sideways, the menu runs off the edge, the heading takes up the whole screen, and the products are squeezed into three tiny columns.",
        "",
        "> From the marketing lead: \"On my phone I have to pinch and scroll sideways to see anything. Our competitors' sites just work. Can we fix this before the spring campaign?\"",
      ],
      [
        "# Your tasks",
        "",
        "## Task 1: Let phones use their real width",
        "",
        "`public/index.html` is missing the viewport meta tag. Without it, phones pretend the screen is about 980px wide and shrink the whole page. Add it inside `<head>`:",
        "",
        "```",
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
        "```",
        "",
        "## Task 2: Make the layout fit every screen",
        "",
        "The page is styled with **Tailwind CSS**: the styles are classes in the components (`src/App.js`, `src/components/Header.js`, `src/components/ProductCard.js`). Change the classes. `src/App.css` holds one custom rule, and you can add plain CSS there if you need it; the tests read it too.",
        "",
        "Tailwind is mobile-first. A class with no prefix applies at every width, and a prefixed class applies from that width up: `sm:` from 640px, `md:` from 768px, `lg:` from 1024px, `xl:` from 1280px. `max-md:` and similar apply below a width. So write the phone layout without a prefix, then add `md:` and `lg:` classes for bigger screens. Arbitrary values such as `w-[480px]` or `max-w-[1100px]` work too.",
        "",
        "**Phone (375px):**",
        "",
        "- Nothing has a fixed width wider than the screen. Prefer `max-w-*` (with `w-full`) to a fixed `w-*` for the page, or only apply fixed widths from a larger breakpoint.",
        "- The header has no fixed height, and the menu links wrap onto a new line (or stack, or sit behind a menu button) instead of running off the edge.",
        "- The hero shows the text above the picture.",
        "- The main heading is 36px (`text-4xl`) or smaller, or scales with the screen.",
        "- Products are in **one** column, and so is the footer.",
        "",
        "**Tablet (768px):** products are in **two** columns.",
        "",
        "**Desktop (1200px):** keep it as it is now: products and footer in **three** columns, with the hero text beside the picture.",
        "",
        "Keep the product list and the footer as grids, and keep the `data-section` attributes: the tests use them to find each part of the page. You can add elements and classes.",
        "",
        "## Task 3: Check it by eye",
        "",
        "Use the **Phone**, **Tablet** and **Desktop** buttons above the preview to see each size. You can also open the preview in a new tab and resize the window, or use your browser's device mode. You should never need to scroll sideways, and the buttons should be easy to tap.",
      ],
      [
        "# How the tests work",
        "",
        "The tests can't see the preview, and Tailwind doesn't run inside them. Instead they read the Tailwind classes on each element and work out which apply at 375px (phone), 768px (tablet) and 1200px (desktop), using Tailwind's breakpoints and default sizes. So they check the classes you wrote, not pixels on a screen. Always check the preview by eye too.",
        "",
        "They understand Tailwind's layout classes: `flex`, `grid`, `hidden`, `block`, `flex-col` / `flex-row`, `flex-wrap`, `grid-cols-*`, `w-*`, `min-w-*`, `max-w-*`, `h-*`, `size-*`, `p-*` / `px-*`, `gap-*`, `text-<size>` and `overflow-x-*`, with any breakpoint prefix and arbitrary values. Colours, borders and other classes don't affect the tests.",
      ],
      [
        "# Project files",
        "",
        ...reactTree("components/", "  Header.js", "  ProductCard.js", "data/", "  products.js", "responsive.test.js", "test-utils/", "  layout.js"),
        "",
        "- `src/App.js`: the storefront page and its Tailwind classes: the page wrapper, hero, best-sellers grid and footer. **Most of your work is here.**",
        "- `src/App.css`: one custom rule (the hero picture's gradient). You can add your own CSS here too; the tests read it.",
        "- `src/components/Header.js`: the logo, the menu (`data-section=\"nav\"`) and the cart link.",
        "- `src/components/ProductCard.js`: one product card: a colour block, the name, the price and an Add to cart button.",
        "- `src/data/products.js`: the six products shown in the grid.",
        "- `public/index.html`: the HTML page the app is loaded into (the page background classes are on `<body>`). **Task 1 is here.**",
        "- `src/responsive.test.js`: the tests, grouped by screen size.",
        "- `src/test-utils/layout.js`: a helper the tests use to work out which Tailwind classes (and any CSS) apply at a given screen width. You don't need to change it.",
        "- `package.json`, `src/index.js` and `src/index.css`: the standard React app setup. `src/index.js` starts the app and loads Tailwind CSS. You don't need to change these.",
      ],
      HOW_TO_CHECK,
    ),
    files: responsiveFiles,
    // Open on the page's markup (where the Tailwind classes are); keep the test helper and
    // setup files out of the tab bar.
    openFile: "/src/App.js",
    tabs: ["/src/App.js", "/src/components/Header.js", "/src/components/ProductCard.js", "/src/App.css", "/public/index.html", "/src/responsive.test.js"],
  },
];

export function getCodeProblem(id: string): CodeProblem | undefined {
  return CODE_PROBLEMS.find((problem) => problem.id === id);
}
