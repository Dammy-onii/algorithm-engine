/**
 * A tiny, safe expression evaluator for user-authored rule conditions.
 *
 * Users write conditions as plain strings in brain/rules.json, e.g.
 *   "wallAhead && !goalVisible"
 *   "goalVisible"
 *   "energy < 5 || stuckAhead"
 *
 * This is deliberately NOT JavaScript eval — only the grammar below is allowed,
 * and identifiers resolve to a fixed context derived from the Observation. That
 * keeps user-written rules expressive but sandbox-safe.
 *
 * Grammar (lowest to highest precedence):
 *   or         := and ( '||' and )*
 *   and        := not ( '&&' not )*
 *   not        := '!' not | comparison
 *   comparison := primary ( ('<'|'>'|'<='|'>='|'=='|'!=') primary )?
 *   primary    := number | true | false | identifier | '(' or ')'
 */

import { Observation } from "../types";

export type EvalContext = Record<string, number | boolean>;

/**
 * User-defined named expressions: `deadEnd` → "wallAhead && wallLeft && wallRight".
 * They compose *perception* the way multi-step bricks compose *actions* — they add
 * vocabulary, never new senses. Resolved recursively at evaluation time.
 */
export type DerivedMap = Record<string, string>;

type Value = number | boolean;

/** Names the engine itself provides. Derived conditions may not shadow these. */
export const BUILTIN_FLAGS = [
  "wallAhead",
  "wallLeft",
  "wallRight",
  "goalVisible",
  "goalAhead",
  "atGoal",
  "visitedAhead",
  "visitedCount",
  "energy",
  "tick",
  "always",
  "never",
] as const;

export type BuiltinFlag = (typeof BUILTIN_FLAGS)[number];

/** Flatten an observation (+ derived flags) into the evaluation context. */
export function contextFromObservation(obs: Observation): EvalContext {
  return {
    wallAhead: obs.wallAhead,
    wallLeft: obs.wallLeft,
    wallRight: obs.wallRight,
    goalVisible: obs.goalVisible,
    atGoal: obs.atGoal,
    visitedAhead: obs.visitedAhead,
    visitedCount: obs.visitedCount,
    tick: obs.tick,
    energy: obs.energy ?? Infinity,
    /** Goal is visible AND lies straight ahead in the facing direction. */
    goalAhead: obs.goalVisible && obs.goalDirection === obs.direction,
    always: true,
    never: false,
  };
}

// --- Tokenizer ------------------------------------------------------------

type Token =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: string };

const OPERATORS = ["<=", ">=", "==", "!=", "&&", "||", "<", ">", "!", "(", ")"];

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ t: "num", v: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      tokens.push({ t: "id", v: src.slice(i, j) });
      i = j;
      continue;
    }
    const op = OPERATORS.find((o) => src.startsWith(o, i));
    if (op) {
      tokens.push({ t: "op", v: op });
      i += op.length;
      continue;
    }
    throw new Error(`Unexpected character '${c}' in condition: "${src}"`);
  }
  return tokens;
}

// --- Parser + evaluator (recursive descent) -------------------------------

/**
 * Resolves identifiers during evaluation: built-in flags first, then user-defined
 * derived conditions (evaluated recursively). Memoises results for the duration of
 * one top-level evaluation and guards against circular definitions.
 */
class Resolver {
  private readonly memo = new Map<string, Value>();
  private readonly stack: string[] = [];

  constructor(
    private readonly ctx: EvalContext,
    private readonly derived: DerivedMap,
  ) {}

  has(name: string): boolean {
    return name in this.ctx || name in this.derived;
  }

  resolve(name: string, src: string): Value {
    if (name in this.ctx) return this.ctx[name];

    const cached = this.memo.get(name);
    if (cached !== undefined) return cached;

    const expr = this.derived[name];
    if (expr === undefined) {
      throw new Error(`Unknown identifier '${name}' in condition: "${src}"`);
    }
    if (this.stack.includes(name)) {
      throw new Error(
        `Circular derived condition: ${[...this.stack, name].join(" → ")}`,
      );
    }

    this.stack.push(name);
    try {
      const value = new Evaluator(tokenize(expr), this, expr).run();
      this.memo.set(name, value);
      return value;
    } finally {
      this.stack.pop();
    }
  }
}

class Evaluator {
  private pos = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly resolver: Resolver,
    private readonly src: string,
  ) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private eatOp(op: string): boolean {
    const tok = this.peek();
    if (tok && tok.t === "op" && tok.v === op) {
      this.pos++;
      return true;
    }
    return false;
  }

  run(): boolean {
    const result = this.parseOr();
    if (this.pos !== this.tokens.length) {
      throw new Error(`Trailing tokens in condition: "${this.src}"`);
    }
    return Boolean(result);
  }

  private parseOr(): Value {
    let left = this.parseAnd();
    while (this.eatOp("||")) {
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  private parseAnd(): Value {
    let left = this.parseNot();
    while (this.eatOp("&&")) {
      const right = this.parseNot();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  private parseNot(): Value {
    if (this.eatOp("!")) {
      return !Boolean(this.parseNot());
    }
    return this.parseComparison();
  }

  private parseComparison(): Value {
    const left = this.parsePrimary();
    for (const op of ["<=", ">=", "==", "!=", "<", ">"]) {
      if (this.eatOp(op)) {
        const right = this.parsePrimary();
        return compare(op, left, right);
      }
    }
    return left;
  }

  private parsePrimary(): Value {
    const tok = this.peek();
    if (!tok) throw new Error(`Unexpected end of condition: "${this.src}"`);

    if (tok.t === "op" && tok.v === "(") {
      this.pos++;
      const v = this.parseOr();
      if (!this.eatOp(")")) {
        throw new Error(`Missing ')' in condition: "${this.src}"`);
      }
      return v;
    }
    if (tok.t === "num") {
      this.pos++;
      return tok.v;
    }
    if (tok.t === "id") {
      this.pos++;
      if (tok.v === "true") return true;
      if (tok.v === "false") return false;
      return this.resolver.resolve(tok.v, this.src);
    }
    throw new Error(`Unexpected token in condition: "${this.src}"`);
  }
}

function compare(op: string, a: Value, b: Value): boolean {
  const x = Number(a);
  const y = Number(b);
  switch (op) {
    case "<":
      return x < y;
    case ">":
      return x > y;
    case "<=":
      return x <= y;
    case ">=":
      return x >= y;
    case "==":
      return a === b;
    case "!=":
      return a !== b;
    default:
      throw new Error(`Unknown operator '${op}'`);
  }
}

/**
 * Evaluate a condition string. Identifiers resolve to built-in observation flags
 * first, then to user-defined derived conditions. Throws on malformed input,
 * unknown identifiers, or circular derived definitions.
 */
export function evaluateCondition(
  expr: string,
  ctx: EvalContext,
  derived: DerivedMap = {},
): boolean {
  const trimmed = expr.trim();
  if (trimmed === "") return true; // empty condition == always
  const resolver = new Resolver(ctx, derived);
  return new Evaluator(tokenize(trimmed), resolver, trimmed).run();
}

/**
 * Static analysis helper: every identifier an expression references (excluding
 * the literals true/false). Used by the loader to validate expressions *before*
 * a run starts, so authoring mistakes surface on Apply rather than mid-simulation.
 */
export function referencedIdentifiers(expr: string): string[] {
  const out = new Set<string>();
  for (const tok of tokenize(expr)) {
    if (tok.t === "id" && tok.v !== "true" && tok.v !== "false") out.add(tok.v);
  }
  return [...out];
}

/** Parse-check an expression without evaluating it. Throws on syntax errors. */
export function assertParsable(expr: string): void {
  const trimmed = expr.trim();
  if (trimmed === "") return;
  // Evaluate against a permissive context: every identifier resolves to false,
  // which exercises the parser without needing a real observation.
  const names = referencedIdentifiers(trimmed);
  const ctx: EvalContext = {};
  for (const n of names) ctx[n] = false;
  new Evaluator(tokenize(trimmed), new Resolver(ctx, {}), trimmed).run();
}
