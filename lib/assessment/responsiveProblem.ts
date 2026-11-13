import type { FileMap } from "./types";

/**
 * "Make the storefront responsive": a desktop-only React page the learner makes work on
 * phones and tablets.
 *
 * Sandpack's tests run in jsdom, which has no layout engine and doesn't apply media
 * queries, so they can't measure the page. Instead test-utils/layout.js reads the CSS rules
 * the page loaded (jsdom keeps them, @media blocks included) and works out which
 * declarations apply to an element at a given screen width: it matches media queries
 * against that width and applies the cascade (specificity, source order, !important,
 * inline styles). The tests then check the result at 375px, 768px and 1200px. Both
 * media-query and fluid solutions (grid auto-fit/minmax, clamp()) are accepted.
 *
 * Files are String.raw so regexes keep their backslashes; they contain no backticks or
 * template placeholders.
 */
export const responsiveFiles: FileMap = {
  "/public/index.html": String.raw`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Northdesk</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
  "/styles.css": String.raw`/* Loaded by index.js. The storefront's own styles are in App.css. */
`,
  "/App.js": String.raw`import "./App.css";
import { Header } from "./components/Header";
import { ProductCard } from "./components/ProductCard";
import { products } from "./data/products";

export default function App() {
  return (
    <div className="page">
      <Header />

      <section className="hero">
        <div className="hero-text">
          <h1>Gear for the way you work</h1>
          <p>Desks, lamps and bags built to last. Free delivery on orders over $50.</p>
          <a className="button" href="#shop">Shop the range</a>
        </div>
        <div className="hero-art" role="img" aria-label="A tidy desk with a lamp" />
      </section>

      <section id="shop">
        <h2>Best sellers</h2>
        <div className="grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <footer className="footer">
        <div>
          <h3>Shop</h3>
          <p>Desks, lighting, bags</p>
        </div>
        <div>
          <h3>Help</h3>
          <p>Delivery, returns, contact us</p>
        </div>
        <div>
          <h3>Company</h3>
          <p>About, careers, press</p>
        </div>
      </footer>
    </div>
  );
}
`,
  "/App.css": String.raw`* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  color: #1f2937;
  background: #fafaf9;
}

.page {
  width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}

.nav {
  display: flex;
  gap: 32px;
}

.nav a,
.cart {
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
}

/* Hero */
.hero {
  display: flex;
  align-items: center;
  gap: 48px;
  padding: 48px 0;
}

.hero-text {
  width: 520px;
}

.hero h1 {
  margin: 0 0 16px;
  font-size: 56px;
  line-height: 1.1;
}

.hero-art {
  width: 480px;
  height: 320px;
  flex-shrink: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #fde68a, #f97316);
}

.button {
  display: inline-block;
  padding: 12px 20px;
  border-radius: 999px;
  background: #1f2937;
  color: #fff;
  text-decoration: none;
}

/* Products */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.card {
  padding: 16px;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
  background: #fff;
}

.thumb {
  height: 180px;
  border-radius: 8px;
}

.card h3 {
  margin: 12px 0 4px;
  font-size: 16px;
}

.price {
  margin: 0 0 12px;
  color: #57534e;
}

.card button {
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: 8px;
  background: #f97316;
  color: #fff;
  font-weight: 600;
}

/* Footer */
.footer {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 48px;
  padding: 48px 0;
  border-top: 1px solid #e7e5e4;
}
`,
  "/components/Header.js": String.raw`const links = ["New in", "Desks", "Lighting", "Bags", "Sale"];

export function Header() {
  return (
    <header className="header">
      <a className="logo" href="/">
        Northdesk
      </a>
      <nav className="nav" aria-label="Main">
        {links.map((link) => (
          <a key={link} href={"#" + link.toLowerCase().replace(" ", "-")}>
            {link}
          </a>
        ))}
      </nav>
      <a className="cart" href="#cart">
        Cart (2)
      </a>
    </header>
  );
}
`,
  "/components/ProductCard.js": String.raw`export function ProductCard({ product }) {
  return (
    <article className="card">
      <div className="thumb" style={{ background: product.color }} />
      <h3>{product.name}</h3>
      <p className="price">{"$" + product.price.toFixed(2)}</p>
      <button type="button">Add to cart</button>
    </article>
  );
}
`,
  "/data/products.js": String.raw`export const products = [
  { id: 1, name: "Oak standing desk", price: 549, color: "#d6c3a5" },
  { id: 2, name: "Task lamp", price: 89, color: "#fcd34d" },
  { id: 3, name: "Commuter backpack", price: 129, color: "#94a3b8" },
  { id: 4, name: "Desk mat", price: 39, color: "#a7f3d0" },
  { id: 5, name: "Monitor stand", price: 75, color: "#c4b5fd" },
  { id: 6, name: "Cable tidy kit", price: 19, color: "#fca5a5" },
];
`,
  "/responsive.test.js": String.raw`import { renderToStaticMarkup } from "react-dom/server";
import indexHtml from "!raw-loader!./public/index.html";
import App from "./App";
import { columnsAt, isStacked, label, lengthPx, styleAt, PHONE, TABLET, DESKTOP } from "./test-utils/layout";

beforeAll(() => {
  document.body.innerHTML = renderToStaticMarkup(<App />);
});

const $ = (selector) => document.querySelector(selector);

describe("setup", () => {
  test("public/index.html has a viewport meta tag", () => {
    const tag = indexHtml.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
    expect(tag && tag[0]).toMatch(/width=device-width/);
    expect(tag && tag[0]).toMatch(/initial-scale=1/);
  });
});

describe("phone (375px)", () => {
  test("nothing has a fixed width wider than the screen", () => {
    const tooWide = [...document.body.querySelectorAll("*")]
      .filter((el) => {
        const style = styleAt(el, PHONE);
        return ["width", "min-width"].some((prop) => lengthPx(style[prop], PHONE) > PHONE);
      })
      .map(label);
    expect(tooWide).toEqual([]);
  });

  test("the header has no fixed height, so it can grow when links wrap", () => {
    const height = styleAt($(".header"), PHONE).height;
    expect(Number.isFinite(lengthPx(height, PHONE)) ? height : "auto").toBe("auto");
  });

  test("nav links wrap or stack instead of running off the screen", () => {
    const nav = styleAt($(".nav"), PHONE);
    const ok =
      /wrap/.test(nav["flex-wrap"] || "") ||
      /^column/.test(nav["flex-direction"] || "") ||
      /grid/.test(nav.display || "") ||
      /auto|scroll/.test(nav["overflow-x"] || "");
    expect(ok).toBe(true);
  });

  test("the hero stacks the text above the picture", () => {
    expect(isStacked($(".hero"), PHONE)).toBe(true);
  });

  test("the main heading is 36px or smaller (or scales with the screen)", () => {
    const size = styleAt($("h1"), PHONE)["font-size"] || "";
    const fluid = /clamp\(|min\(|vw/.test(size);
    expect(fluid || lengthPx(size, PHONE) <= 36).toBe(true);
  });

  test("products are in one column", () => {
    expect(columnsAt($(".grid"), PHONE)).toBe(1);
  });

  test("the footer is in one column", () => {
    expect(columnsAt($(".footer"), PHONE)).toBe(1);
  });
});

describe("tablet (768px)", () => {
  test("products are in two columns", () => {
    expect(columnsAt($(".grid"), TABLET)).toBe(2);
  });
});

describe("desktop (1200px) still looks as it did", () => {
  test("products are in three columns", () => {
    expect(columnsAt($(".grid"), DESKTOP)).toBe(3);
  });

  test("the footer is in three columns", () => {
    expect(columnsAt($(".footer"), DESKTOP)).toBe(3);
  });

  test("the hero text sits beside the picture", () => {
    expect(isStacked($(".hero"), DESKTOP)).toBe(false);
  });
});
`,
  "/test-utils/layout.js": String.raw`/*
 * Test helper: works out which CSS declarations apply to an element at a given screen
 * width. The test environment has no real layout, so this reads the stylesheets the page
 * loaded, keeps the rules whose media queries match the width, and applies the cascade
 * (specificity, source order, !important, inline styles). You don't need to change it.
 */

export const PHONE = 375;
export const TABLET = 768;
export const DESKTOP = 1200;

/**
 * A length in px at the given screen width, or NaN when it isn't a length (auto, fr, ...).
 * Percentages are measured against the screen width, which is close enough for page-level
 * layout: width: 100% fits the screen, and min(1100px, 100%) is never wider than it.
 */
export function lengthPx(value, width) {
  const v = String(value == null ? "" : value).trim().toLowerCase();
  if (v === "0") return 0;
  const m = /^(-?[\d.]+)(px|rem|em|%|vw)$/.exec(v);
  if (m) {
    const n = parseFloat(m[1]);
    if (m[2] === "px") return n;
    if (m[2] === "rem" || m[2] === "em") return n * 16;
    return (n * width) / 100; // % and vw
  }
  const fn = /^(min|max)\((.*)\)$/.exec(v);
  if (fn) {
    const parts = splitArgs(fn[2]).map((p) => lengthPx(p, width)).filter(Number.isFinite);
    if (parts.length === 0) return NaN;
    return fn[1] === "min" ? Math.min(...parts) : Math.max(...parts);
  }
  return NaN;
}

function splitArgs(text) {
  const out = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function splitSpaces(text) {
  const out = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (current) out.push(current);
      current = "";
    } else current += ch;
  }
  if (current) out.push(current);
  return out;
}

/* ---- media queries ---- */

const COMPARE = {
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
};

function featureMatches(feature, width) {
  const minMax = /^(min|max)-width\s*:\s*(.+)$/.exec(feature);
  if (minMax) {
    const limit = lengthPx(minMax[2], width);
    return minMax[1] === "min" ? width >= limit : width <= limit;
  }
  // Range syntax: (width <= 600px), (600px < width <= 900px)
  const tokens = feature.split(/\s*(<=|>=|<|>)\s*/);
  if (tokens.length >= 3 && tokens.includes("width")) {
    const value = (t) => (t === "width" ? width : lengthPx(t, width));
    for (let i = 0; i + 2 < tokens.length; i += 2) {
      if (!COMPARE[tokens[i + 1]](value(tokens[i]), value(tokens[i + 2]))) return false;
    }
    return true;
  }
  return false; // other features (orientation, hover, prefers-*) are treated as not matching
}

export function mediaMatches(mediaText, width) {
  const text = String(mediaText || "").trim().toLowerCase();
  if (!text) return true;
  return text.split(",").some((query) => {
    let q = query.trim();
    const negate = q.startsWith("not ");
    if (negate) q = q.slice(4);
    q = q.replace(/^only\s+/, "");
    const ok = q.split(/\s+and\s+/).every((part) => {
      const p = part.trim();
      if (p === "all" || p === "screen") return true;
      const feature = /^\((.*)\)$/.exec(p);
      return feature ? featureMatches(feature[1].trim(), width) : false;
    });
    return negate ? !ok : ok;
  });
}

/* ---- cascade ---- */

function collectRules(rules, width, out) {
  for (const rule of Array.from(rules)) {
    if (rule.selectorText !== undefined && rule.style) out.push(rule);
    else if (rule.media && rule.cssRules) {
      if (mediaMatches(rule.media.mediaText, width)) collectRules(rule.cssRules, width, out);
    } else if (rule.cssRules) collectRules(rule.cssRules, width, out); // @supports etc.
  }
  return out;
}

function specificity(selector) {
  const ids = (selector.match(/#[\w-]+/g) || []).length;
  const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|(^|[^:]):[\w-]+/g) || []).length;
  const stripped = selector.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+(\([^)]*\))?/g, " ");
  const types = (stripped.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
  return ids * 1e6 + classes * 1e3 + types;
}

function setProp(style, prop, value) {
  style[prop] = value;
  const parts = splitSpaces(value);
  if (prop === "padding" || prop === "margin") {
    const [top, right = top, bottom = top, left = right] = parts;
    Object.assign(style, { [prop + "-top"]: top, [prop + "-right"]: right, [prop + "-bottom"]: bottom, [prop + "-left"]: left });
  } else if (prop === "flex-flow") {
    for (const p of parts) {
      if (/^(row|column)/.test(p)) style["flex-direction"] = p;
      if (/wrap/.test(p)) style["flex-wrap"] = p;
    }
  } else if (prop === "gap" || prop === "grid-gap") {
    style["row-gap"] = parts[0];
    style["column-gap"] = parts[1] || parts[0];
  } else if (prop === "grid-column-gap") style["column-gap"] = value;
  else if (prop === "overflow") {
    style["overflow-x"] = parts[0];
    style["overflow-y"] = parts[1] || parts[0];
  }
}

/** The declarations that apply to el when the screen is width px wide (property -> value). */
export function styleAt(el, width) {
  const rules = [];
  for (const sheet of Array.from(document.styleSheets)) collectRules(sheet.cssRules, width, rules);
  const matched = [];
  rules.forEach((rule, order) => {
    let best = -1;
    for (const part of splitArgs(rule.selectorText)) {
      try {
        if (el.matches(part)) best = Math.max(best, specificity(part));
      } catch {
        // selectors jsdom can't match (::before, ...) never apply to an element
      }
    }
    if (best >= 0) matched.push({ style: rule.style, spec: best, order });
  });
  matched.sort((a, b) => a.spec - b.spec || a.order - b.order);

  const style = {};
  const inline = String(el.getAttribute("style") || "")
    .split(";")
    .map((d) => d.split(":"))
    .filter((d) => d.length >= 2)
    .map(([p, ...v]) => [p.trim().toLowerCase(), v.join(":").trim()]);
  for (const important of [false, true]) {
    for (const { style: decl } of matched) {
      for (let i = 0; i < decl.length; i++) {
        const prop = decl[i];
        if ((decl.getPropertyPriority(prop) === "important") === important) setProp(style, prop, decl.getPropertyValue(prop));
      }
    }
    if (!important) for (const [p, v] of inline) setProp(style, p, v);
  }
  return style;
}

/** Width available to el's content, following fixed widths, max-widths and padding down from the page. */
function contentWidth(el, width) {
  const chain = [];
  for (let node = el; node && node !== document.documentElement; node = node.parentElement) chain.unshift(node);
  let available = width;
  for (const node of chain) {
    const s = styleAt(node, width);
    const fixed = lengthPx(s.width, width);
    if (Number.isFinite(fixed)) available = fixed;
    const max = lengthPx(s["max-width"], width);
    if (Number.isFinite(max)) available = Math.min(available, max);
    available -= (lengthPx(s["padding-left"], width) || 0) + (lengthPx(s["padding-right"], width) || 0);
  }
  return available;
}

function trackMin(track, available) {
  const m = /^minmax\((.*)\)$/.exec(track);
  const min = m ? splitArgs(m[1])[0] : track;
  const pct = /^([\d.]+)%$/.exec(min);
  if (pct) return (parseFloat(pct[1]) * available) / 100;
  const fn = /^min\((.*)\)$/.exec(min);
  if (fn) return Math.min(...splitArgs(fn[1]).map((a) => trackMin(a, available)).filter(Number.isFinite));
  return lengthPx(min, available);
}

function countTracks(value, available, gap) {
  const v = String(value || "").trim();
  if (!v || v === "none") return 1;
  let count = 0;
  for (const token of splitSpaces(v)) {
    if (token.startsWith("[")) continue; // line names
    const rep = /^repeat\((.*)\)$/.exec(token);
    if (!rep) {
      count += 1;
      continue;
    }
    const [times, ...rest] = splitArgs(rep[1]);
    const inner = splitSpaces(rest.join(",")).filter((t) => !t.startsWith("["));
    if (/^auto-(fit|fill)$/.test(times)) {
      const unit = inner.reduce((sum, t) => sum + trackMin(t, available), 0) + gap * (inner.length - 1);
      if (!(unit > 0)) return NaN;
      count += Math.max(1, Math.floor((available + gap) / (unit + gap))) * inner.length;
    } else count += parseInt(times, 10) * inner.length;
  }
  return count;
}

/** How many columns a grid (or stacked flex box) has at the given screen width. */
export function columnsAt(el, width) {
  const s = styleAt(el, width);
  const display = s.display || "block";
  if (/flex/.test(display)) return /^column/.test(s["flex-direction"] || "") ? 1 : NaN;
  if (!/grid/.test(display)) return 1;
  return countTracks(s["grid-template-columns"], contentWidth(el, width), lengthPx(s["column-gap"], width) || 0);
}

/** Whether el's children sit one above the other at the given width. */
export function isStacked(el, width) {
  const s = styleAt(el, width);
  const display = s.display || "block";
  if (/flex/.test(display)) return /^column/.test(s["flex-direction"] || "");
  if (/grid/.test(display)) return columnsAt(el, width) === 1;
  return true;
}

/** A short readable name for an element, used in failure messages. */
export function label(el) {
  const cls = el.getAttribute("class");
  return el.tagName.toLowerCase() + (cls ? "." + cls.trim().split(/\s+/).join(".") : "");
}
`,
};
