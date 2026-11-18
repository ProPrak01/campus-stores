export type CalcResult = { ok: true; value: number } | { ok: false; error: string };

/**
 * A small calculator parser. Supports + - * / × ÷, parentheses, unary minus and a postfix %.
 * It never uses eval or Function.
 *
 *   expr    = term (("+" | "-") term)*
 *   term    = unary (("*" | "/") unary)*
 *   unary   = ("-" | "+") unary | postfix
 *   postfix = primary "%"*
 *   primary = number | "(" expr ")"
 */
export function calculate(input: string): CalcResult {
  // "2 3" must not quietly become 23.
  if (/[\d.]\s+[\d.]/.test(input)) return { ok: false, error: "Unexpected number. Put an operator between numbers." };
  const src = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  if (!src) return { ok: false, error: "Type a sum first." };
  let i = 0;

  class CalcError extends Error {}
  const fail = (m: string): never => {
    throw new CalcError(m);
  };

  const number = (): number => {
    const m = /^\d*\.?\d+|^\d+\.?/.exec(src.slice(i));
    if (!m) return fail("Expected a number.");
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const primary = (): number => {
    if (src[i] === "(") {
      i++;
      const v = expr();
      if (src[i] !== ")") fail("Missing a closing bracket.");
      i++;
      return v;
    }
    return number();
  };
  const postfix = (): number => {
    let v = primary();
    while (src[i] === "%") {
      i++;
      v /= 100;
    }
    return v;
  };
  const unary = (): number => {
    if (src[i] === "-") {
      i++;
      return -unary();
    }
    if (src[i] === "+") {
      i++;
      return unary();
    }
    return postfix();
  };
  const term = (): number => {
    let v = unary();
    while (src[i] === "*" || src[i] === "/") {
      const op = src[i++];
      const r = unary();
      if (op === "/" && r === 0) fail("Cannot divide by zero.");
      v = op === "*" ? v * r : v / r;
    }
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (src[i] === "+" || src[i] === "-") v = src[i++] === "+" ? v + term() : v - term();
    return v;
  };

  try {
    const value = expr();
    if (i < src.length) fail(`Unexpected "${src[i]}".`);
    if (!Number.isFinite(value)) fail("That result is too large.");
    return { ok: true, value: Number(value.toPrecision(12)) };
  } catch (e) {
    if (e instanceof CalcError) return { ok: false, error: e.message };
    throw e;
  }
}
