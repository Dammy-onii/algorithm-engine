import type { FileMap } from "./types";

/**
 * Standard React app layout used by the React code problems (runtime "react-app"):
 *
 *   package.json
 *   public/index.html
 *   src/index.js      starts the app, imports index.css, loads Tailwind
 *   src/index.css     global styles
 *   src/App.js        the app
 *   src/App.css       custom styles for App (the rest is Tailwind classes)
 *   src/...           components, utils, data, tests
 *
 * Tailwind v4's browser build is loaded from src/index.js: Sandpack doesn't run <script>
 * tags in public/index.html, but a script added from JavaScript runs.
 *
 * Files are String.raw so regexes keep their backslashes; they contain no backticks or
 * template placeholders.
 */
export function reactApp(options: {
  name: string;
  title: string;
  /** Leave out the viewport meta tag (the responsive problem asks the learner to add it). */
  withoutViewport?: boolean;
  /** Classes on <body> (Tailwind). */
  bodyClass?: string;
  appCss: string;
  /** Files under src/ (keys without the /src prefix, e.g. "/App.js"), plus any others with a full path via `extra`. */
  src: FileMap;
  extra?: FileMap;
}): FileMap {
  const viewport = options.withoutViewport
    ? ""
    : '\n    <meta name="viewport" content="width=device-width, initial-scale=1" />';
  const files: FileMap = {
    "/package.json": JSON.stringify(
      {
        name: options.name,
        version: "1.0.0",
        private: true,
        main: "src/index.js",
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", "react-scripts": "^5.0.0" },
        scripts: { start: "react-scripts start", build: "react-scripts build", test: "react-scripts test" },
      },
      null,
      2,
    ) + "\n",
    "/public/index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />${viewport}
    <title>${options.title}</title>
  </head>
  <body${options.bodyClass ? ` class="${options.bodyClass}"` : ""}>
    <div id="root"></div>
  </body>
</html>
`,
    "/src/index.js": String.raw`import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Tailwind CSS (v4 browser build). Components are styled with Tailwind classes.
// The script is added here because this editor doesn't run <script> tags in
// public/index.html.
const tailwind = document.createElement("script");
tailwind.src = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";
document.head.appendChild(tailwind);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    "/src/index.css": String.raw`body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace;
}
`,
    "/src/App.css": options.appCss,
  };
  for (const [path, code] of Object.entries(options.src)) files["/src" + path] = code;
  return { ...files, ...(options.extra ?? {}) };
}

/* ---- Fix the cart total ---- */

export const cartAppFiles: FileMap = reactApp({
  name: "shop-cart",
  title: "Your cart",
  bodyClass: "bg-stone-50 text-gray-800",
  appCss: String.raw`/* Keep the digits of prices lined up. */
.price {
  font-variant-numeric: tabular-nums;
}
`,
  src: {
    "/App.js": String.raw`import "./App.css";
import { CartSummary } from "./components/CartSummary";

const items = [
  { id: 1, name: "Notebook", price: 4.5, quantity: 3 },
  { id: 2, name: "Pen set", price: 12, quantity: 1 },
  { id: 3, name: "Desk lamp", price: 29.99, quantity: 2 },
];

export default function App() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">Your cart</h1>
      <CartSummary items={items} />
    </main>
  );
}
`,
    "/components/CartSummary.js": String.raw`import { cartTotal, formatPrice } from "../utils/cart";

export function CartSummary({ items }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <ul className="divide-y divide-stone-100">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between py-2">
            <span>
              {item.name} x{item.quantity}
            </span>
            <span className="price">{formatPrice(item.price)}</span>
          </li>
        ))}
      </ul>
      <strong className="price mt-3 block border-t border-stone-200 pt-3 text-lg">
        Total: {formatPrice(cartTotal(items))}
      </strong>
    </section>
  );
}
`,
    "/utils/cart.js": String.raw`export function formatPrice(value) {
  return "$" + value.toFixed(2);
}

// TODO: customers report the total looks too low.
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
`,
    "/utils/cart.test.js": String.raw`import { cartTotal, formatPrice } from "./cart";

test("formats prices with two decimals", () => {
  expect(formatPrice(4.5)).toBe("$4.50");
});

test("totals a single line", () => {
  expect(cartTotal([{ price: 10, quantity: 1 }])).toBe(10);
});

test("multiplies price by quantity", () => {
  expect(cartTotal([{ price: 10, quantity: 3 }])).toBe(30);
});
`,
  },
});

/** Hidden tests for the cart, used by the company-flow example project. */
export const cartAppHiddenTests: FileMap = {
  "/src/utils/cart.hidden.test.js": String.raw`import { cartTotal } from "./cart";

test("handles an empty cart", () => {
  expect(cartTotal([])).toBe(0);
});

test("avoids floating point drift", () => {
  expect(cartTotal([{ price: 0.1, quantity: 3 }])).toBe(0.3);
});

test("treats a missing quantity as 1", () => {
  expect(cartTotal([{ price: 5 }])).toBe(5);
});
`,
};

/* ---- Order history pagination ---- */

export const paginationAppFiles: FileMap = reactApp({
  name: "order-history",
  title: "My orders",
  bodyClass: "bg-stone-50 text-gray-800",
  appCss: String.raw`/* Keep order numbers lined up. */
.order-number {
  font-variant-numeric: tabular-nums;
}
`,
  src: {
    "/App.js": String.raw`import { useState } from "react";
import "./App.css";
import { paginate } from "./utils/paginate";
import { orders } from "./data/orders";

export default function App() {
  const [page, setPage] = useState(1);
  const result = paginate(orders, page, 5);

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">My orders</h1>
      <ul className="mb-4 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
        {result.items.map((order) => (
          <li key={order.id} className="flex justify-between px-4 py-2">
            <span className="order-number">Order #{order.id}</span>
            <span className="text-stone-500">{new Date(order.createdAt).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <button
          className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40"
          onClick={() => setPage(page + 1)}
          disabled={page * result.limit >= result.total}
        >
          Next
        </button>
        <p className="ml-auto text-sm text-stone-500">
          Page {result.page}, {result.total} orders
        </p>
      </div>
    </main>
  );
}
`,
    "/data/orders.js": String.raw`// 23 orders. A higher id is a more recent order.
export const orders = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  createdAt: Date.UTC(2026, 0, 1) + i * 86_400_000,
}));
`,
    "/utils/paginate.js": String.raw`export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

// Customers say page 1 skips their newest orders, and Next never stops.
export function paginate(items, page, limit) {
  const start = page * limit;
  return { items: items.slice(start, start + limit), page, limit };
}
`,
    "/utils/paginate.test.js": String.raw`import { paginate } from "./paginate";

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
  },
});

/* ---- The wrong product gets added ---- */

export const searchAppFiles: FileMap = reactApp({
  name: "shop-search",
  title: "Shop",
  bodyClass: "bg-stone-50 text-gray-800",
  appCss: String.raw`/* Show the product list and the cart side by side on wide screens. */
.shop-layout {
  display: grid;
  gap: 24px;
}

@media (min-width: 640px) {
  .shop-layout {
    grid-template-columns: 2fr 1fr;
  }
}
`,
  src: {
    "/App.js": String.raw`import { useState } from "react";
import "./App.css";
import { products } from "./data/products";
import { addToCart, searchProducts } from "./utils/cart";

export default function App() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const visible = searchProducts(products, query);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Shop</h1>
      <div className="shop-layout">
        <section>
          <input
            className="mb-3 w-full rounded-lg border border-stone-300 px-3 py-2"
            placeholder="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul aria-label="Products" className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {visible.map((product) => (
              <li key={product.id} className="flex items-center justify-between px-4 py-2">
                {product.name}
                <button
                  className="rounded-lg bg-orange-500 px-3 py-1 text-sm font-semibold text-white"
                  onClick={() => setCart(addToCart(cart, products, product.id))}
                >
                  Add to cart
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 font-semibold">Cart</h2>
          <ul aria-label="Cart" className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
            {cart.map((line) => (
              <li key={line.id}>
                {line.name} x{line.quantity}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
`,
    "/data/products.js": String.raw`export const products = [
  { id: 1, name: "Backpack" },
  { id: 2, name: "Water Bottle" },
  { id: 3, name: "Notebook" },
  { id: 4, name: "Desk Lamp" },
];
`,
    "/utils/cart.js": String.raw`// Users say: "I searched for 'Backpack', clicked Add to cart, and a Water Bottle got added."
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
    "/utils/cart.test.js": String.raw`import { addToCart, searchProducts } from "./cart";

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
  },
});
