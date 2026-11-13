import { cartAppFiles, cartAppHiddenTests } from "../reactApp";
import type { FileMap } from "../types";

const reactFiles: FileMap = {
  "/App.js": `import { CartSummary } from "./components/CartSummary";

const items = [
  { id: 1, name: "Notebook", price: 4.5, quantity: 3 },
  { id: 2, name: "Pen set", price: 12, quantity: 1 },
  { id: 3, name: "Desk lamp", price: 29.99, quantity: 2 },
];

export default function App() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Your cart</h1>
      <CartSummary items={items} />
    </main>
  );
}
`,
  "/components/CartSummary.js": `import { cartTotal, formatPrice } from "../utils/cart";

export function CartSummary({ items }) {
  return (
    <section>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} x{item.quantity}: {formatPrice(item.price)}
          </li>
        ))}
      </ul>
      <strong>Total: {formatPrice(cartTotal(items))}</strong>
    </section>
  );
}
`,
  "/utils/cart.js": `export function formatPrice(value) {
  return "$" + value.toFixed(2);
}

// TODO: customers report the total looks too low.
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
`,
  "/utils/cart.test.js": `import { cartTotal, formatPrice } from "./cart";

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
};

export function reactExample() {
  return {
    scenario: [
      "You have joined a small shop's engineering team. This cart is live and customers are complaining.",
      "",
      "# Your tasks",
      "",
      "## Task 1: Fix the cart total",
      "",
      "> \"The total at checkout is lower than what I added to my cart.\"",
      "",
      "- Find out why `cartTotal` is wrong and fix it.",
      "- Make sure the visible tests in `utils/cart.test.js` pass.",
      "",
      "## Task 2: Review your own change",
      "",
      "Add a short comment above the fix explaining what you would check before shipping it.",
    ].join("\n"),
    files: reactFiles,
    hiddenTests: {
      "/utils/cart.hidden.test.js": `import { cartTotal } from "./cart";

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
    } as FileMap,
  };
}

export function vanillaExample() {
  return {
    scenario:
      "The word counter on this page miscounts text with extra spaces or new lines. Fix the logic and make the visible tests pass.",
    files: {
      "/index.js": `import { countWords } from "./counter";

const input = document.getElementById("input");
const output = document.getElementById("count");
input.addEventListener("input", () => {
  output.textContent = String(countWords(input.value));
});
`,
      "/counter.js": `// Known issue: extra spaces inflate the count.
export function countWords(text) {
  return text.split(" ").length;
}
`,
      "/counter.test.js": `import { countWords } from "./counter";

test("counts simple sentences", () => {
  expect(countWords("hello brave world")).toBe(3);
});

test("ignores repeated spaces", () => {
  expect(countWords("hello    world")).toBe(2);
});
`,
      "/index.html": `<!DOCTYPE html>
<html>
  <body style="font-family: system-ui; padding: 24px">
    <textarea id="input" rows="4" cols="40"></textarea>
    <p>Words: <span id="count">0</span></p>
    <script src="index.js"></script>
  </body>
</html>
`,
    } as FileMap,
    hiddenTests: {
      "/counter.hidden.test.js": `import { countWords } from "./counter";

test("empty string is zero words", () => {
  expect(countWords("")).toBe(0);
});

test("handles newlines and tabs", () => {
  expect(countWords("a\\nb\\tc")).toBe(3);
});
`,
    } as FileMap,
  };
}

/** The cart example in the standard React app layout (runtime "react-app"). */
export function reactAppExample() {
  return {
    scenario: reactExample().scenario.replace("`utils/cart.test.js`", "`src/utils/cart.test.js`"),
    files: cartAppFiles,
    hiddenTests: cartAppHiddenTests,
  };
}
