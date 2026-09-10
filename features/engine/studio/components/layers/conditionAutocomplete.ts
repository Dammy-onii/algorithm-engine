export interface IdentifierRange {
  start: number;
  end: number;
  query: string;
}

/** Find the identifier fragment under the caret, including a partially typed one. */
export function activeIdentifierRange(
  expression: string,
  caret: number,
): IdentifierRange {
  const safeCaret = Math.min(Math.max(caret, 0), expression.length);
  let start = safeCaret;
  let end = safeCaret;

  while (start > 0 && /[A-Za-z0-9_]/.test(expression[start - 1])) start -= 1;
  while (end < expression.length && /[A-Za-z0-9_]/.test(expression[end])) {
    end += 1;
  }

  return {
    start,
    end,
    query: expression.slice(start, safeCaret),
  };
}

export function replaceActiveIdentifier(
  expression: string,
  caret: number,
  identifier: string,
): { value: string; caret: number } {
  const range = activeIdentifierRange(expression, caret);
  return {
    value:
      expression.slice(0, range.start) +
      identifier +
      expression.slice(range.end),
    caret: range.start + identifier.length,
  };
}
