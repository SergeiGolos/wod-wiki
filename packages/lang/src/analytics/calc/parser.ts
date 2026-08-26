/**
 * Hand-rolled parser for the calc expression language.
 *
 * Line-oriented and small by design (review doc §11.4): expressions use a
 * Pratt parser; WQL atoms (`sum:reps{...} by {effort}`) lex as single atoms
 * and stay opaque here — the QueryService layer executes them. The full
 * authoring surface (sections, `|` variant sugar, `where` bindings) belongs
 * to the line-form compiler (#863/#880); seeds are DAG records (#849), so
 * only the expression/predicate core and the single-line form live here.
 */

import { BinaryOp, CalcLine, ExprNode } from './ast';

export class CalcParseError extends Error {
  constructor(message: string, readonly pos: number) {
    super(`${message} (at ${pos})`);
    this.name = 'CalcParseError';
  }
}

type Token =
  | { t: 'num'; v: number; pos: number }
  | { t: 'period'; v: number; pos: number } // trailing window: 7d, 28d
  | { t: 'str'; v: string; pos: number }
  | { t: 'ident'; v: string; pos: number }
  | { t: 'filter'; v: string; pos: number } // raw without: exclusion filter
  | { t: 'op'; v: string; pos: number }
  | { t: 'brace'; v: string; pos: number } // raw {...} contents
  | { t: 'eof'; pos: number };

const IDENT_START = /[A-Za-z_]/;
const IDENT_CHAR = /[A-Za-z0-9_.]/;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c >= '0' && c <= '9' || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      const m = /^\d*\.?\d+/.exec(src.slice(i))!;
      const end = i + m[0].length;
      // Trailing-period literal: `7d`, `28d` — window durations.
      if (src[end] === 'd' && !(end + 1 < src.length && IDENT_CHAR.test(src[end + 1]))) {
        tokens.push({ t: 'period', v: parseFloat(m[0]), pos: i });
        i = end + 1;
        continue;
      }
      tokens.push({ t: 'num', v: parseFloat(m[0]), pos: i });
      i = end;
      continue;
    }
    if (c === '"' || c === "'") {
      const end = src.indexOf(c, i + 1);
      if (end < 0) throw new CalcParseError('Unterminated string literal', i);
      tokens.push({ t: 'str', v: src.slice(i + 1, end), pos: i });
      i = end + 1;
      continue;
    }
    if (c === '{') {
      const end = src.indexOf('}', i + 1);
      if (end < 0) throw new CalcParseError('Unterminated filter braces', i);
      tokens.push({ t: 'brace', v: src.slice(i + 1, end), pos: i });
      i = end + 1;
      continue;
    }
    if (IDENT_START.test(c)) {
      let j = i + 1;
      while (j < src.length && IDENT_CHAR.test(src[j])) j++;
      const word = src.slice(i, j);
      // `without: rest|pause|rest-*` — raw exclusion filter (| and * are not
      // expression operators), lexed verbatim up to the next ',' or ')'.
      if (word === 'without') {
        const m = /^\s*:\s*([^,)]+)/.exec(src.slice(j));
        if (m) {
          tokens.push({ t: 'filter', v: m[1].trim(), pos: i });
          i = j + m[0].length;
          continue;
        }
      }
      tokens.push({ t: 'ident', v: word, pos: i });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === '==' || two === '!=' || two === '<=' || two === '>=' || two === '->') {
      tokens.push({ t: 'op', v: two, pos: i });
      i += 2;
      continue;
    }
    if ('+-*/()<>=,:'.includes(c)) {
      tokens.push({ t: 'op', v: c, pos: i });
      i++;
      continue;
    }
    throw new CalcParseError(`Unexpected character '${c}'`, i);
  }
  tokens.push({ t: 'eof', pos: src.length });
  return tokens;
}

const BINARY_PRECEDENCE: Record<string, number> = {
  or: 1,
  and: 2,
  '==': 3, '!=': 3, '<': 3, '<=': 3, '>': 3, '>=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5,
};

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token { return this.tokens[this.pos]; }
  private next(): Token { return this.tokens[this.pos++]; }

  private isOp(v: string): boolean {
    const tok = this.peek();
    return tok.t === 'op' && tok.v === v;
  }

  private isIdent(v: string): boolean {
    const tok = this.peek();
    return tok.t === 'ident' && tok.v === v;
  }

  /** Parse a full expression; must consume all input. */
  parseTop(): ExprNode {
    const expr = this.parseExpression();
    const tail = this.peek();
    if (tail.t !== 'eof') throw new CalcParseError('Unexpected trailing input', tail.pos);
    return expr;
  }

  private expectOp(v: string): Token {
    const tok = this.next();
    if (tok.t !== 'op' || tok.v !== v) throw new CalcParseError(`Expected '${v}'`, tok.pos);
    return tok;
  }

  /** Binary operator at the current position: punctuation or and/or keyword. */
  private binaryOp(): { op: BinaryOp; prec: number } | undefined {
    const tok = this.peek();
    const v = tok.t === 'op' ? tok.v : tok.t === 'ident' && (tok.v === 'and' || tok.v === 'or') ? tok.v : undefined;
    if (v === undefined) return undefined;
    const prec = BINARY_PRECEDENCE[v];
    return prec === undefined ? undefined : { op: v as BinaryOp, prec };
  }

  parseExpression(minPrec = 1): ExprNode {
    let left = this.parseUnary();
    for (;;) {
      const b = this.binaryOp();
      if (!b || b.prec < minPrec) return left;
      this.next();
      const right = this.parseExpression(b.prec + 1);
      left = { kind: 'binary', op: b.op, left, right };
    }
  }

  private parseUnary(): ExprNode {
    const tok = this.peek();
    if (tok.t === 'op' && tok.v === '-') {
      this.next();
      return { kind: 'unary', op: '-', arg: this.parseUnary() };
    }
    if (tok.t === 'ident' && tok.v === 'not') {
      this.next();
      return { kind: 'unary', op: 'not', arg: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprNode {
    const tok = this.next();
    if (tok.t === 'num') return { kind: 'literal', value: tok.v };
    if (tok.t === 'period') return { kind: 'period', days: tok.v };
    if (tok.t === 'str') return { kind: 'string', value: tok.v };
    if (tok.t === 'op' && tok.v === '(') {
      const inner = this.parseExpression();
      this.expectOp(')');
      return inner;
    }
    if (tok.t === 'op' && tok.v === ':') {
      throw new CalcParseError("Unexpected ':'", tok.pos);
    }
    if (tok.t === 'ident') {
      // WQL atom: aggregator:metric{filters} by {dims} — store scope only.
      if (this.isOp(':')) {
        this.next();
        const metric = this.next();
        if (metric.t !== 'ident') throw new CalcParseError('Expected metric name after aggregator', metric.pos);
        let filters: string | undefined;
        let groupBy: string[] | undefined;
        const maybeBrace = this.peek();
        if (maybeBrace.t === 'brace') { filters = maybeBrace.v; this.next(); }
        if (this.isIdent('by')) {
          this.next();
          const dims = this.next();
          if (dims.t !== 'brace') throw new CalcParseError("Expected '{dims}' after 'by'", dims.pos);
          groupBy = dims.v.split(',').map((d) => d.trim()).filter(Boolean);
        }
        return { kind: 'wql', aggregator: tok.v, metric: metric.v, filters, groupBy };
      }
      // Function call.
      if (this.isOp('(')) {
        this.next();
        const args: ExprNode[] = [];
        if (!this.isOp(')')) {
          for (;;) {
            args.push(this.parseArg());
            const sep = this.next();
            if (sep.t === 'op' && sep.v === ',') continue;
            if (sep.t === 'op' && sep.v === ')') break;
            throw new CalcParseError("Expected ',' or ')' in argument list", sep.pos);
          }
        } else {
          this.next();
        }
        return { kind: 'call', name: tok.v, args };
      }
      return { kind: 'ref', name: tok.v };
    }
    throw new CalcParseError('Expected expression', tok.pos);
  }

  /** One call argument; `without:` filters arrive pre-lexed. */
  private parseArg(): ExprNode {
    const tok = this.peek();
    if (tok.t === 'filter') {
      this.next();
      return { kind: 'filter', value: tok.v };
    }
    return this.parseExpression();
  }
}

/** Parse a standalone expression or predicate. */
export function parseExpression(src: string): ExprNode {
  return new Parser(tokenize(src)).parseTop();
}

/** Raw token scan for the calc-line form: find top-level `->` and ` when `. */
function splitCalcLine(src: string): { head: string; unit?: string; when?: string } {
  const tokens = tokenize(src);
  let arrowIdx = -1;
  let whenIdx = -1;
  let depth = 0;
  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k];
    if (tok.t === 'op' && tok.v === '(') depth++;
    else if (tok.t === 'op' && tok.v === ')') depth--;
    else if (depth === 0 && tok.t === 'op' && tok.v === '->' && arrowIdx < 0) arrowIdx = k;
    else if (depth === 0 && tok.t === 'ident' && tok.v === 'when') { whenIdx = k; break; }
  }
  const headEnd = arrowIdx >= 0 ? tokens[arrowIdx].pos : whenIdx >= 0 ? tokens[whenIdx].pos : src.length;
  const head = src.slice(0, headEnd).trim();
  let unit: string | undefined;
  let when: string | undefined;
  if (arrowIdx >= 0) {
    const unitEnd = whenIdx >= 0 ? tokens[whenIdx].pos : src.length;
    unit = src.slice(tokens[arrowIdx].pos + 2, unitEnd).trim();
  }
  if (whenIdx >= 0) when = src.slice(tokens[whenIdx].pos + 4).trim();
  return { head, unit: unit || undefined, when: when || undefined };
}

/**
 * Parse one calc line: `name = expr -> unit when predicate`.
 * Unit may be `auto`; `key`/`grouped` output declarations are registry
 * concerns (record form), not parsed here.
 */
export function parseCalcLine(src: string): CalcLine {
  const { head, unit, when } = splitCalcLine(src);
  const eq = head.indexOf('=');
  if (eq < 0) throw new CalcParseError("Expected '=' in calc line", 0);
  const name = head.slice(0, eq).trim();
  if (!name) throw new CalcParseError('Missing calc name', 0);
  const exprSrc = head.slice(eq + 1).trim();
  if (!exprSrc) throw new CalcParseError('Missing expression', eq + 1);
  return {
    name,
    expr: parseExpression(exprSrc),
    unit,
    when: when ? parseExpression(when) : undefined,
  };
}
