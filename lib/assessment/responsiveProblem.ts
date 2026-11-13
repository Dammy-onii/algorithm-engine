import { reactApp } from "./reactApp";
import type { FileMap } from "./types";

/**
 * "Make the storefront responsive": a desktop-only React page styled with Tailwind CSS
 * that the learner makes work on phones and tablets.
 *
 * The project uses the standard React app layout (see reactApp.ts). Tailwind (v4 browser
 * build) is loaded from src/index.js: Sandpack does not execute <script>
 * tags written in index.html, but a script added from JavaScript runs. Its generated CSS
 * exists only in the preview, so the tests can't read it. Instead test-utils/layout.js
 * reads the Tailwind classes on each rendered element and works out which ones apply at a
 * screen width (breakpoint prefixes, Tailwind's default scale, arbitrary values), merged
 * with any ordinary CSS rules the page loaded (@media included). The tests check the result
 * at 375px, 768px and 1200px. jsdom has no layout engine, so this is the only way to test
 * a layout there.
 *
 * Files are String.raw so regexes keep their backslashes; they contain no backticks or
 * template placeholders.
 */
const src: FileMap = {
  "/App.js": String.raw`import "./App.css";
import { Header } from "./components/Header";
import { ProductCard } from "./components/ProductCard";
import { products } from "./data/products";

export default function App() {
  return (
    <div data-section="page" className="mx-auto w-[1100px] px-6">
      <Header />

      <section data-section="hero" className="flex items-center gap-12 py-12">
        <div data-section="hero-text" className="w-[520px]">
          <h1 className="mb-4 text-6xl font-bold leading-tight">Gear for the way you work</h1>
          <p className="mb-6 text-lg text-stone-600">
            Desks, lamps and bags built to last. Free delivery on orders over $50.
          </p>
          <a className="inline-block rounded-full bg-gray-800 px-5 py-3 text-white" href="#shop">
            Shop the range
          </a>
        </div>
        <div
          data-section="hero-art"
          role="img"
          aria-label="A tidy desk with a lamp"
          className="hero-art h-80 w-[480px] shrink-0 rounded-2xl"
        />
      </section>

      <section id="shop">
        <h2 className="mb-4 text-2xl font-semibold">Best sellers</h2>
        <div data-section="grid" className="grid grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <footer data-section="footer" className="mt-12 grid grid-cols-3 gap-6 border-t border-stone-200 py-12">
        <div>
          <h3 className="font-semibold">Shop</h3>
          <p className="text-stone-500">Desks, lighting, bags</p>
        </div>
        <div>
          <h3 className="font-semibold">Help</h3>
          <p className="text-stone-500">Delivery, returns, contact us</p>
        </div>
        <div>
          <h3 className="font-semibold">Company</h3>
          <p className="text-stone-500">About, careers, press</p>
        </div>
      </footer>
    </div>
  );
}
`,
  "/components/Header.js": String.raw`const links = ["New in", "Desks", "Lighting", "Bags", "Sale"];

export function Header() {
  return (
    <header data-section="header" className="flex h-18 items-center justify-between">
      <a className="text-xl font-bold" href="/">
        Northdesk
      </a>
      <nav data-section="nav" aria-label="Main" className="flex gap-8">
        {links.map((link) => (
          <a key={link} className="whitespace-nowrap hover:text-orange-600" href={"#" + link.toLowerCase().replace(" ", "-")}>
            {link}
          </a>
        ))}
      </nav>
      <a className="whitespace-nowrap" href="#cart">
        Cart (2)
      </a>
    </header>
  );
}
`,
  "/components/ProductCard.js": String.raw`export function ProductCard({ product }) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="h-44 rounded-lg" style={{ background: product.color }} />
      <h3 className="mt-3 mb-1 font-semibold">{product.name}</h3>
      <p className="mb-3 text-stone-500">{"$" + product.price.toFixed(2)}</p>
      <button type="button" className="w-full rounded-lg bg-orange-500 py-2.5 font-semibold text-white">
        Add to cart
      </button>
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
import indexHtml from "!raw-loader!../public/index.html";
import App from "./App";
import { columnsAt, isHidden, isStacked, label, lengthPx, styleAt, PHONE, TABLET, DESKTOP } from "./test-utils/layout";

beforeAll(() => {
  document.body.innerHTML = renderToStaticMarkup(<App />);
});

const section = (name) => document.querySelector('[data-section="' + name + '"]');

describe("setup", () => {
  test("public/index.html has a viewport meta tag", () => {
    const match = indexHtml.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
    const tag = match ? match[0] : "(no viewport meta tag in public/index.html)";
    expect(tag).toMatch(/width=device-width/);
    expect(tag).toMatch(/initial-scale=1/);
  });
});

describe("phone (375px)", () => {
  test("nothing has a fixed width wider than the screen", () => {
    const tooWide = [...document.body.querySelectorAll("*")]
      .filter((el) => !isHidden(el, PHONE))
      .filter((el) => {
        const style = styleAt(el, PHONE);
        return ["width", "min-width"].some((prop) => lengthPx(style[prop], PHONE) > PHONE);
      })
      .map(label);
    expect(tooWide).toEqual([]);
  });

  test("the header has no fixed height, so it can grow when links wrap", () => {
    const height = styleAt(section("header"), PHONE).height;
    expect(Number.isFinite(lengthPx(height, PHONE)) ? height : "auto").toBe("auto");
  });

  test("nav links wrap or stack instead of running off the screen", () => {
    const nav = styleAt(section("nav"), PHONE);
    const behindMenuButton =
      isHidden(section("nav"), PHONE) && section("header").querySelector("button[aria-expanded]") !== null;
    const ok =
      behindMenuButton ||
      /wrap/.test(nav["flex-wrap"] || "") ||
      /^column/.test(nav["flex-direction"] || "") ||
      /grid/.test(nav.display || "") ||
      /auto|scroll/.test(nav["overflow-x"] || "");
    expect(ok).toBe(true);
  });

  test("the hero stacks the text above the picture", () => {
    expect(isStacked(section("hero"), PHONE)).toBe(true);
  });

  test("the main heading is 36px or smaller (or scales with the screen)", () => {
    const size = styleAt(document.querySelector("h1"), PHONE)["font-size"] || "";
    const fluid = /clamp\(|min\(|vw/.test(size);
    expect(fluid || lengthPx(size, PHONE) <= 36).toBe(true);
  });

  test("products are in one column", () => {
    expect(columnsAt(section("grid"), PHONE)).toBe(1);
  });

  test("the footer is in one column", () => {
    expect(columnsAt(section("footer"), PHONE)).toBe(1);
  });
});

describe("tablet (768px)", () => {
  test("products are in two columns", () => {
    expect(columnsAt(section("grid"), TABLET)).toBe(2);
  });
});

describe("desktop (1200px) still looks as it did", () => {
  test("products are in three columns", () => {
    expect(columnsAt(section("grid"), DESKTOP)).toBe(3);
  });

  test("the footer is in three columns", () => {
    expect(columnsAt(section("footer"), DESKTOP)).toBe(3);
  });

  test("the hero text sits beside the picture", () => {
    expect(isStacked(section("hero"), DESKTOP)).toBe(false);
  });
});
`,
  "/test-utils/layout.js": String.raw`/*
 * Test helper: works out the styles that apply to an element at a given screen width.
 * The test environment has no real browser layout and doesn't load Tailwind, so this:
 *   1. reads the element's Tailwind classes and applies the ones whose breakpoint
 *      prefixes match the width, using Tailwind's default scale and arbitrary values;
 *   2. merges any ordinary CSS rules the page loaded (media queries included).
 * It understands Tailwind's layout utilities: display, flex direction and wrap, grid
 * columns, width / min-width / max-width / height / size, padding, gap, text size and
 * overflow. Other classes (colours, borders, ...) are ignored. You don't need to change it.
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

/* ---- Tailwind classes ---- */

const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };
const CONTAINER = {
  "3xs": 256, "2xs": 288, xs: 320, sm: 384, md: 448, lg: 512, xl: 576,
  "2xl": 672, "3xl": 768, "4xl": 896, "5xl": 1024, "6xl": 1152, "7xl": 1280,
};
const TEXT = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36,
  "5xl": 48, "6xl": 60, "7xl": 72, "8xl": 96, "9xl": 128,
};
const DISPLAY = {
  flex: "flex", "inline-flex": "inline-flex", grid: "grid", "inline-grid": "inline-grid",
  block: "block", "inline-block": "inline-block", inline: "inline", hidden: "none", contents: "contents",
};
const DIRECTION = { "flex-row": "row", "flex-row-reverse": "row-reverse", "flex-col": "column", "flex-col-reverse": "column-reverse" };
const SIZE_PROP = { w: "width", h: "height", "min-w": "min-width", "max-w": "max-width", "min-h": "min-height", "max-h": "max-height" };

function arbitrary(v) {
  const m = /^\[(.+)\]$/.exec(v);
  return m ? m[1].replace(/_/g, " ") : null;
}

function sizeValue(v, axis) {
  const arb = arbitrary(v);
  if (arb !== null) return arb;
  const named = { full: "100%", auto: "auto", none: "none", px: "1px", fit: "fit-content", min: "min-content", max: "max-content" };
  if (v in named) return named[v];
  if (v === "screen") return axis === "h" ? "100vh" : "100vw";
  const frac = /^(\d+)\/(\d+)$/.exec(v);
  if (frac) return (100 * Number(frac[1])) / Number(frac[2]) + "%";
  if (/^\d+(\.\d+)?$/.test(v)) return parseFloat(v) * 4 + "px"; // spacing scale: 0.25rem per step
  if (axis === "w" && v in CONTAINER) return CONTAINER[v] + "px";
  return null;
}

/** The CSS declarations a Tailwind utility (without prefixes) sets, or null if not understood. */
function utility(name) {
  if (name in DISPLAY) return [["display", DISPLAY[name]]];
  if (name in DIRECTION) return [["flex-direction", DIRECTION[name]]];
  if (/^flex-(wrap|nowrap|wrap-reverse)$/.test(name)) return [["flex-wrap", name.slice(5)]];
  let m;
  if ((m = /^grid-cols-(.+)$/.exec(name))) {
    const arb = arbitrary(m[1]);
    if (arb !== null) return [["grid-template-columns", arb]];
    if (m[1] === "none") return [["grid-template-columns", "none"]];
    if (/^\d+$/.test(m[1])) return [["grid-template-columns", "repeat(" + m[1] + ", minmax(0, 1fr))"]];
    return null;
  }
  if ((m = /^(min-w|max-w|min-h|max-h|w|h|size)-(.+)$/.exec(name))) {
    const value = sizeValue(m[2], m[1].endsWith("h") ? "h" : "w");
    if (value === null) return null;
    return m[1] === "size" ? [["width", value], ["height", value]] : [[SIZE_PROP[m[1]], value]];
  }
  if ((m = /^p([xlr]?)-(.+)$/.exec(name))) {
    const value = sizeValue(m[2], "w");
    if (value === null) return null;
    if (m[1] === "l") return [["padding-left", value]];
    if (m[1] === "r") return [["padding-right", value]];
    return [["padding-left", value], ["padding-right", value]];
  }
  if ((m = /^gap(-x)?-(.+)$/.exec(name))) {
    const value = sizeValue(m[2], "w");
    return value === null ? null : [["column-gap", value]];
  }
  if ((m = /^text-(.+)$/.exec(name))) {
    if (m[1] in TEXT) return [["font-size", TEXT[m[1]] + "px"]];
    const arb = arbitrary(m[1]);
    if (arb !== null && (Number.isFinite(lengthPx(arb, 1000)) || /clamp\(|min\(|max\(|vw/.test(arb))) return [["font-size", arb]];
    return null; // colours etc.
  }
  if ((m = /^overflow(-x)?-(auto|scroll|hidden|visible|clip)$/.exec(name))) return [["overflow-x", m[2]]];
  return null;
}

function splitVariants(cls) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of cls) {
    if (ch === "[") depth++;
    if (ch === "]") depth--;
    if (ch === ":" && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);
  return parts;
}

function variantMatches(variant, width) {
  if (variant in BREAKPOINTS) return width >= BREAKPOINTS[variant];
  let m;
  if ((m = /^max-(.+)$/.exec(variant)) && m[1] in BREAKPOINTS) return width < BREAKPOINTS[m[1]];
  if ((m = /^min-\[(.+)\]$/.exec(variant))) return width >= lengthPx(m[1], width);
  if ((m = /^max-\[(.+)\]$/.exec(variant))) return width < lengthPx(m[1], width);
  return false; // hover:, focus:, dark:, ... don't apply in these checks
}

/** Tailwind declarations that apply to el at the given width, in the order Tailwind applies them. */
function tailwindDeclarations(el, width) {
  const found = [];
  for (const cls of String(el.getAttribute("class") || "").split(/\s+/).filter(Boolean)) {
    const parts = splitVariants(cls);
    const name = parts.pop().replace(/^!|!$/g, "");
    if (!parts.every((v) => variantMatches(v, width))) continue;
    const decls = utility(name);
    if (!decls) continue;
    // Unprefixed first, then larger breakpoints (Tailwind's mobile-first order).
    const order = parts.reduce((sum, v) => sum + (BREAKPOINTS[v] || 1), 0);
    found.push({ order, decls });
  }
  return found.sort((a, b) => a.order - b.order).flatMap((f) => f.decls);
}

/* ---- ordinary CSS (media queries + cascade) ---- */

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
  const tokens = feature.split(/\s*(<=|>=|<|>)\s*/);
  if (tokens.length >= 3 && tokens.includes("width")) {
    const value = (t) => (t === "width" ? width : lengthPx(t, width));
    for (let i = 0; i + 2 < tokens.length; i += 2) {
      if (!COMPARE[tokens[i + 1]](value(tokens[i]), value(tokens[i + 2]))) return false;
    }
    return true;
  }
  return false;
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

function collectRules(rules, width, out) {
  for (const rule of Array.from(rules)) {
    if (rule.selectorText !== undefined && rule.style) out.push(rule);
    else if (rule.media && rule.cssRules) {
      if (mediaMatches(rule.media.mediaText, width)) collectRules(rule.cssRules, width, out);
    } else if (rule.cssRules) collectRules(rule.cssRules, width, out);
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

/** The styles that apply to el when the screen is width px wide (property -> value). */
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
  const applyRules = (important) => {
    for (const { style: decl } of matched) {
      for (let i = 0; i < decl.length; i++) {
        const prop = decl[i];
        if ((decl.getPropertyPriority(prop) === "important") === important) setProp(style, prop, decl.getPropertyValue(prop));
      }
    }
  };
  applyRules(false);
  for (const [prop, value] of tailwindDeclarations(el, width)) setProp(style, prop, value);
  const inline = String(el.getAttribute("style") || "")
    .split(";")
    .map((d) => d.split(":"))
    .filter((d) => d.length >= 2);
  for (const [p, ...v] of inline) setProp(style, p.trim().toLowerCase(), v.join(":").trim());
  applyRules(true);
  return style;
}

/** Whether el (or any parent) is display: none at the given width. */
export function isHidden(el, width) {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (styleAt(node, width).display === "none") return true;
  }
  return false;
}

/* ---- layout helpers used by the tests ---- */

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
  const section = el.getAttribute("data-section");
  if (section) return el.tagName.toLowerCase() + '[data-section="' + section + '"]';
  const cls = el.getAttribute("class");
  return el.tagName.toLowerCase() + (cls ? "." + cls.trim().split(/\s+/).join(".") : "");
}
`,
};

export const responsiveFiles: FileMap = reactApp({
  name: "northdesk-storefront",
  title: "Northdesk",
  withoutViewport: true,
  bodyClass: "bg-stone-50 text-gray-800",
  appCss: String.raw`/* The hero picture's gradient. Everything else is styled with Tailwind classes. */
.hero-art {
  background: linear-gradient(135deg, #fde68a, #f97316);
}
`,
  src,
});
