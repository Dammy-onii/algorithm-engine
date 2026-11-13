import { vanillaExample, reactExample } from "./runtime/examples";
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
  runtimeId: "react-js" | "vanilla-js";
  /** One or two lines for the list card. */
  summary: string;
  /** Shown in the brief panel (Markdown subset). */
  scenario: string;
  files: FileMap;
}

const cart = reactExample();
const counter = vanillaExample();

const paginationFiles: FileMap = {
  "/App.js": `import { useState } from "react";
import { paginate } from "./utils/paginate";
import { orders } from "./data/orders";

export default function App() {
  const [page, setPage] = useState(1);
  const result = paginate(orders, page, 5);

  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>My orders</h1>
      <ul>
        {result.items.map((order) => (
          <li key={order.id}>
            Order #{order.id} ({new Date(order.createdAt).toLocaleDateString()})
          </li>
        ))}
      </ul>
      <button onClick={() => setPage(page - 1)} disabled={page <= 1}>Previous</button>{" "}
      <button onClick={() => setPage(page + 1)} disabled={page * result.limit >= result.total}>Next</button>
      <p>Page {result.page}, {result.total} orders</p>
    </main>
  );
}
`,
  "/data/orders.js": `// 23 orders. A higher id is a more recent order.
export const orders = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  createdAt: Date.UTC(2026, 0, 1) + i * 86_400_000,
}));
`,
  "/utils/paginate.js": `export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

// Customers say page 1 skips their newest orders and big page sizes hang the page.
export function paginate(items, page, limit) {
  const start = page * limit;
  return { items: items.slice(start, start + limit), page, limit };
}
`,
  "/utils/paginate.test.js": `import { paginate } from "./paginate";

const orders = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, createdAt: i + 1 }));

test("page 1 returns the most recent orders first", () => {
  const ids = paginate(orders, 1, 10).items.map((o) => o.id);
  expect(ids).toEqual([25, 24, 23, 22, 21, 20, 19, 18, 17, 16]);
});

test("limit defaults to 10", () => {
  const result = paginate(orders, 1);
  expect(result.limit).toBe(10);
  expect(result.items).toHaveLength(10);
});

test("limit is capped at 50", () => {
  const many = Array.from({ length: 120 }, (_, i) => ({ id: i + 1, createdAt: i + 1 }));
  const result = paginate(many, 1, 500);
  expect(result.limit).toBe(50);
  expect(result.items).toHaveLength(50);
});

test("returns items, page, limit and total", () => {
  expect(paginate(orders, 2, 10)).toMatchObject({ page: 2, limit: 10, total: 25 });
});

test("a page past the end is empty", () => {
  expect(paginate(orders, 9, 10).items).toEqual([]);
});
`,
};

const searchFiles: FileMap = {
  "/App.js": `import { useState } from "react";
import { products } from "./data/products";
import { addToCart, searchProducts } from "./utils/cart";

export default function App() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const visible = searchProducts(products, query);

  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Shop</h1>
      <input placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul aria-label="Products">
        {visible.map((product) => (
          <li key={product.id}>
            {product.name}{" "}
            <button onClick={() => setCart(addToCart(cart, products, product.id))}>Add to cart</button>
          </li>
        ))}
      </ul>
      <h2>Cart</h2>
      <ul aria-label="Cart">
        {cart.map((line) => <li key={line.id}>{line.name} x{line.quantity}</li>)}
      </ul>
    </main>
  );
}
`,
  "/data/products.js": `export const products = [
  { id: 1, name: "Backpack" },
  { id: 2, name: "Water Bottle" },
  { id: 3, name: "Notebook" },
  { id: 4, name: "Desk Lamp" },
];
`,
  "/utils/cart.js": `// Users say: "I searched for 'Backpack', clicked Add to cart, and a Water Bottle got added."
export function searchProducts(products, query) {
  return products.filter((product) => product.name.includes(query));
}

export function addToCart(cart, products, productId) {
  const product = products[productId];
  if (!product) return cart;
  const existing = cart.find((line) => line.id === product.id);
  if (existing) {
    existing.quantity += 1;
    return cart;
  }
  return [...cart, { id: product.id, name: product.name, quantity: 1 }];
}
`,
  "/utils/cart.test.js": `import { addToCart, searchProducts } from "./cart";

const products = [
  { id: 1, name: "Backpack" },
  { id: 2, name: "Water Bottle" },
  { id: 3, name: "Notebook" },
];

test("adds the product with the clicked id", () => {
  expect(addToCart([], products, 1)).toEqual([{ id: 1, name: "Backpack", quantity: 1 }]);
});

test("works on a filtered list", () => {
  const filtered = searchProducts(products, "back");
  expect(addToCart([], filtered, 1)[0].name).toBe("Backpack");
});

test("adding twice increases the quantity", () => {
  const once = addToCart([], products, 2);
  expect(addToCart(once, products, 2)).toEqual([{ id: 2, name: "Water Bottle", quantity: 2 }]);
});

test("does not change the cart it was given", () => {
  const cart = [{ id: 3, name: "Notebook", quantity: 1 }];
  addToCart(cart, products, 3);
  expect(cart[0].quantity).toBe(1);
});

test("ignores an unknown product id", () => {
  expect(addToCart([], products, 99)).toEqual([]);
});

test("search ignores letter case", () => {
  expect(searchProducts(products, "WATER").map((p) => p.name)).toEqual(["Water Bottle"]);
});
`,
};

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
  "- `index.js`, `styles.css`, `public/index.html`, `package.json`: the React setup that starts the app. You don't need to change these.";
const VANILLA_SETUP = "- `styles.css`, `package.json`: project setup. You don't need to change these.";

export const CODE_PROBLEMS: readonly CodeProblem[] = [
  {
    id: "cart-total",
    title: "Fix the cart total",
    level: "easy",
    runtimeId: "react-js",
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
        "- Find out why `cartTotal` in `utils/cart.js` returns the wrong number, and fix it.",
        "- Each line costs its price times its quantity. The total is the sum of all lines.",
        "- Make every test in `utils/cart.test.js` pass, and check that the preview shows **Total: $85.48**.",
        "- The item lines show the price of one unit (for example `Desk lamp x2: $29.99`). That is intended and doesn't need to change.",
        "",
        "## Task 2: Review your own change",
        "",
        "Above your fix, add a short comment saying what else you would check before shipping it. Think about unusual carts a real customer could have.",
      ],
      [
        "# Project files",
        "",
        "```",
        "App.js",
        "components/",
        "  CartSummary.js",
        "utils/",
        "  cart.js",
        "  cart.test.js",
        "```",
        "",
        "- `App.js`: the cart page. It holds the sample cart (three items) and renders the summary.",
        "- `components/CartSummary.js`: lists each item and shows the total, using the helpers in `utils/cart.js`.",
        "- `utils/cart.js`: the cart maths. `formatPrice` turns a number into `$0.00` text and `cartTotal` adds up the cart.",
        "- `utils/cart.test.js`: the tests for `utils/cart.js`.",
        REACT_SETUP,
      ],
      HOW_TO_CHECK,
    ),
    files: cart.files,
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
    runtimeId: "react-js",
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
        "Fix `paginate(items, page, limit)` in `utils/paginate.js` so that:",
        "",
        "- Pages are numbered from 1, and page 1 holds the **most recent** orders (newest `createdAt` first).",
        "- The array passed in is not reordered. Sort a copy.",
        "- `limit` is 10 when it isn't given, and never more than 50. Use the `DEFAULT_LIMIT` and `MAX_LIMIT` constants.",
        "- The result is `{ items, page, limit, total }`, where `total` is the number of orders across all pages.",
        "- A page past the end has an empty `items` list.",
        "",
        "Make every test in `utils/paginate.test.js` pass.",
        "",
        "## Task 2: Check the page",
        "",
        "In the preview, page 1 should start with **Order #23** (the newest). Next and Previous should walk through all 23 orders, and Next should be disabled on the last page (page 5).",
      ],
      [
        "# Project files",
        "",
        "```",
        "App.js",
        "data/",
        "  orders.js",
        "utils/",
        "  paginate.js",
        "  paginate.test.js",
        "```",
        "",
        "- `App.js`: the My orders page. It keeps the current page number, asks `paginate` for 5 orders at a time and uses `total` to decide when Next is disabled.",
        "- `data/orders.js`: 23 sample orders, each with an `id` and a `createdAt` timestamp. A higher id is a more recent order.",
        "- `utils/paginate.js`: the paging helper and its `DEFAULT_LIMIT` / `MAX_LIMIT` constants.",
        "- `utils/paginate.test.js`: the tests for `paginate`.",
        REACT_SETUP,
      ],
      HOW_TO_CHECK,
    ),
    files: paginationFiles,
  },
  {
    id: "wrong-product-in-cart",
    title: "The wrong product gets added",
    level: "medium",
    runtimeId: "react-js",
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
        "Fix `addToCart(cart, products, productId)` in `utils/cart.js` so that:",
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
        "Make every test in `utils/cart.test.js` pass.",
        "",
        "## Task 3: Check the page",
        "",
        "In the preview, search for `back` and add the Backpack twice. The cart should show **Backpack x2** and nothing else.",
      ],
      [
        "# Project files",
        "",
        "```",
        "App.js",
        "data/",
        "  products.js",
        "utils/",
        "  cart.js",
        "  cart.test.js",
        "```",
        "",
        "- `App.js`: the shop page. It holds the search text and the cart, shows the matching products with an Add to cart button each, and lists the cart.",
        "- `data/products.js`: the four products for sale, each with an `id` and a `name`.",
        "- `utils/cart.js`: `searchProducts` (filters products by name) and `addToCart` (returns the cart with a product added).",
        "- `utils/cart.test.js`: the tests for both helpers.",
        REACT_SETUP,
      ],
      HOW_TO_CHECK,
    ),
    files: searchFiles,
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
];

export function getCodeProblem(id: string): CodeProblem | undefined {
  return CODE_PROBLEMS.find((problem) => problem.id === id);
}
