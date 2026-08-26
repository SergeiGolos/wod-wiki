/**
 * Expression evaluator for the composed calculations layer.
 *
 * The core owns arithmetic, comparison/logic, and the scalar function table
 * (min, max, abs, round, floor, ceil, clamp, convert, has). Everything
 * scope-dependent — metric refs, context nodes, stream aggregates, lookup(),
 * WQL atoms — resolves through the EvalContext, so the same evaluator serves
 * segment, workout, and store scopes (spec §3.1).
 */

import { ExprNode } from './ast';
import { addDim, subDim, dimEquals, formatDim, DIM_ZERO } from './dimensions';
import { convertScalar, UNITS, composeMulUnit, composeDivUnit } from './units';
import { ABSENT, num, str, truthy, Val } from './values';

export class CalcEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalcEvalError';
  }
}

export interface EvalContext {
  /** Resolve a ref atom (metric, context node, library node). ABSENT when missing. */
  resolveRef(name: string): Val;
  /**
   * Extension functions (stream aggregates, lookup). Receives evaluated args
   * plus the raw arg nodes (aggregates need the filter node unevaluated).
   * Return undefined to signal "not mine" → CalcEvalError.
   */
  callFunction?(name: string, args: Val[], rawArgs: ExprNode[]): Val | undefined;
  /** Store-scope WQL selections (QueryService). Store scope only. */
  resolveWql?(node: Extract<ExprNode, { kind: 'wql' }>): Val;
}

export function evaluate(node: ExprNode, ctx: EvalContext): Val {
  switch (node.kind) {
    case 'literal':
      return num(node.value);
    case 'period':
      return { kind: 'period', days: node.days };
    case 'string':
      return str(node.value);
    case 'ref':
      return ctx.resolveRef(node.name);
    case 'filter':
      throw new CalcEvalError('Exclusion filter is only valid as an aggregate argument');
    case 'wql':
      if (!ctx.resolveWql) throw new CalcEvalError(`WQL atom ${node.aggregator}:${node.metric} is store-scope only`);
      return ctx.resolveWql(node);
    case 'unary': {
      const v = evaluate(node.arg, ctx);
      if (node.op === 'not') return num(truthy(v) ? 0 : 1);
      if (v.kind === 'absent') return ABSENT;
      if (v.kind !== 'number') throw new CalcEvalError('Unary minus requires a number');
      return num(-v.value, v.dim, v.unit);
    }
    case 'binary':
      return evalBinary(node, ctx);
    case 'call':
      return evalCall(node, ctx);
  }
}

function evalBinary(node: Extract<ExprNode, { kind: 'binary' }>, ctx: EvalContext): Val {
  const { op } = node;
  if (op === 'and') {
    const l = evaluate(node.left, ctx);
    if (!truthy(l)) return num(0);
    return num(truthy(evaluate(node.right, ctx)) ? 1 : 0);
  }
  if (op === 'or') {
    const l = evaluate(node.left, ctx);
    if (truthy(l)) return num(1);
    return num(truthy(evaluate(node.right, ctx)) ? 1 : 0);
  }
  const l = evaluate(node.left, ctx);
  const r = evaluate(node.right, ctx);

  if (l.kind === 'series' || r.kind === 'series') {
    return seriesBinary(op, l, r);
  }

  if (op === '==' || op === '!=') {
    const eq = valuesEqual(l, r);
    return num(op === '==' ? (eq ? 1 : 0) : eq ? 0 : 1);
  }
  if (l.kind === 'absent' || r.kind === 'absent') {
    // Missing data: comparisons are false (#848), arithmetic stays absent.
    if (op === '<' || op === '<=' || op === '>' || op === '>=') return num(0);
    return ABSENT;
  }
  if (l.kind !== 'number' || r.kind !== 'number') {
    throw new CalcEvalError(`Operator '${op}' requires numbers`);
  }
  switch (op) {
    case '+':
    case '-': {
      if (!dimEquals(l.dim, r.dim)) {
        throw new CalcEvalError(`Dimension mismatch for '${op}': ${formatDim(l.dim)} vs ${formatDim(r.dim)}`);
      }
      return num(op === '+' ? l.value + r.value : l.value - r.value, l.dim, l.unit ?? r.unit);
    }
    case '*': {
      const dim = addDim(l.dim, r.dim);
      return num(l.value * r.value, dim, composeMulUnit(l.unit, l.dim, r.unit, r.dim, dim));
    }
    case '/': {
      if (r.value === 0) return ABSENT;
      const dim = subDim(l.dim, r.dim);
      return num(l.value / r.value, dim, composeDivUnit(l.unit, r.unit, r.dim, dim));
    }
    case '<': return num(baseValue(l) < baseValue(r) ? 1 : 0);
    case '<=': return num(baseValue(l) <= baseValue(r) ? 1 : 0);
    case '>': return num(baseValue(l) > baseValue(r) ? 1 : 0);
    case '>=': return num(baseValue(l) >= baseValue(r) ? 1 : 0);
  }
}

/**
 * Pointwise series arithmetic (spec §3.2). Binary ops iterate the left
 * operand's day domain: a missing right point (or a zero divisor) suppresses
 * the point — that's how ACWR vanishes while chronic = 0. Scalar operands
 * broadcast across every point.
 */
function seriesBinary(op: string, l: Val, r: Val): Val {
  if (op === 'and' || op === 'or' || op === '==' || op === '!=' || op === '<' || op === '<=' || op === '>' || op === '>=') {
    throw new CalcEvalError(`Operator '${op}' is not defined on series`);
  }
  if (l.kind === 'absent' || r.kind === 'absent') return ABSENT;
  const lSeries = l.kind === 'series' ? l : undefined;
  const rSeries = r.kind === 'series' ? r : undefined;
  const scalarOf = (v: Val): number | undefined => (v.kind === 'number' ? v.value : undefined);
  if (!lSeries && scalarOf(l) === undefined) throw new CalcEvalError(`Operator '${op}' requires numbers or series`);
  if (!rSeries && scalarOf(r) === undefined) throw new CalcEvalError(`Operator '${op}' requires numbers or series`);

  const lNum = scalarOf(l);
  const rNum = scalarOf(r);
  const lDim = l.kind === 'number' || l.kind === 'series' ? l.dim : undefined;
  const rDim = r.kind === 'number' || r.kind === 'series' ? r.dim : undefined;
  if ((op === '+' || op === '-') && lDim && rDim && !dimEquals(lDim, rDim)) {
    throw new CalcEvalError(`Dimension mismatch for '${op}': ${formatDim(lDim)} vs ${formatDim(rDim)}`);
  }
  const resultDim =
    op === '*' ? addDim(lDim ?? DIM_ZERO, rDim ?? DIM_ZERO)
    : op === '/' ? subDim(lDim ?? DIM_ZERO, rDim ?? DIM_ZERO)
    : (lDim ?? rDim ?? DIM_ZERO);

  const apply = (a: number, b: number): number | undefined => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? undefined : a / b;
      default: return undefined;
    }
  };

  const points = new Map<number, number>();
  const domain = lSeries ?? rSeries!;
  for (const [day, lv] of domain.points) {
    const a = lSeries ? lv : lNum!;
    const b = rSeries ? rSeries.points.get(day) : rNum!;
    if (b === undefined) continue;
    const value = apply(a, b);
    if (value !== undefined && Number.isFinite(value)) points.set(day, value);
  }
  return { kind: 'series', points, dim: resultDim };
}

function valuesEqual(l: Val, r: Val): boolean {
  if (l.kind === 'absent' || r.kind === 'absent') return l.kind === r.kind;
  if (l.kind === 'string' || r.kind === 'string') {
    return l.kind === 'string' && r.kind === 'string' && l.value === r.value;
  }
  if (l.kind !== 'number' || r.kind !== 'number') return l.kind === r.kind;
  if (!dimEquals(l.dim, r.dim)) return false;
  return baseValue(l) === baseValue(r);
}

/** Scalar in the vector's base unit, so `90 s` compares correctly to `1.5 min`. */
function baseValue(v: Extract<Val, { kind: 'number' }>): number {
  if (!v.unit) return v.value;
  const def = UNITS[v.unit];
  return def ? v.value * def.factor : v.value;
}

function evalCall(node: Extract<ExprNode, { kind: 'call' }>, ctx: EvalContext): Val {
  const { name, args } = node;

  if (name === 'has') {
    if (args.length !== 1) throw new CalcEvalError('has() takes one argument');
    const v = evaluate(args[0], ctx);
    return num(v.kind === 'absent' ? 0 : 1);
  }
  if (name === 'convert') {
    if (args.length !== 2) throw new CalcEvalError('convert() takes (value, targetUnit)');
    const target = unitArg(args[1]);
    const v = evaluate(args[0], ctx);
    if (v.kind === 'absent') return ABSENT;
    if (v.kind !== 'number') throw new CalcEvalError('convert() requires a number');
    const to = UNITS[target];
    if (!to) throw new CalcEvalError(`Unknown unit: ${target}`);
    if (!dimEquals(v.dim, to.dim)) {
      throw new CalcEvalError(`convert() dimension mismatch: ${formatDim(v.dim)} is not ${formatDim(to.dim)}`);
    }
    return num(convertScalar(v.value, v.unit, target), to.dim, target);
  }

  // Filter args stay raw — only extension functions (aggregates) read them.
  const vals = args.map((a) => (a.kind === 'filter' ? ABSENT : evaluate(a, ctx)));

  // Aggregate disambiguation: sum/max/min/avg/count/last with a ref or
  // filter first argument are stream aggregates, delegated to the context
  // (e.g. max(effortRpe)); scalar min/max keep their math meaning
  // (min(100, score)). Segment scope has no aggregate resolver, so its
  // min/max always fall through to scalar.
  if (AGGREGATE_NAMES[name] && (args[0]?.kind === 'ref' || args[0]?.kind === 'filter')) {
    const extended = ctx.callFunction?.(name, vals, args);
    if (extended !== undefined) return extended;
  }

  // Trailing window maps (store-scope series tier, spec §3.2). Window math
  // is parity-pinned to workloadRollup.ts: iteration order k = 0..p−1 over
  // loadAt(day−k) matches the reference exactly (bit-identical floats).
  if (name === 'windowMean' || name === 'windowSum' || name === 'windowSd') {
    const [series, period] = vals;
    if (series?.kind === 'absent') return ABSENT;
    if (series?.kind !== 'series' || period?.kind !== 'period') {
      throw new CalcEvalError(`${name}() takes (series, period)`);
    }
    return windowMap(name, series, period.days);
  }

  // EWMA over the continuous day domain (PMC-style, #905): recursion
  // v_d = v_{d-1} + (load_d − v_{d-1}) / N with the canonical 1/N gain
  // (TrainingPeaks CTL/ATL), seeded at 0 and warmed by the zero-filled
  // domain — early days underestimate until the window saturates.
  if (name === 'windowEwma') {
    const [series, period] = vals;
    if (series?.kind === 'absent') return ABSENT;
    if (series?.kind !== 'series' || period?.kind !== 'period') {
      throw new CalcEvalError('windowEwma() takes (series, period)');
    }
    const gain = 1 / period.days;
    let prev = 0;
    const points = new Map<number, number>();
    for (const day of [...series.points.keys()].sort((a, b) => a - b)) {
      prev = prev + ((series.points.get(day) ?? 0) - prev) * gain;
      points.set(day, prev);
    }
    return { kind: 'series', points, dim: series.dim, unit: series.unit };
  }

  // Scalar reductions over a series: sum/mean/min/max/last.
  if (vals[0]?.kind === 'series' && (name === 'sum' || name === 'mean' || name === 'min' || name === 'max' || name === 'last')) {
    const series = vals[0];
    const values = [...series.points.values()];
    if (values.length === 0) return ABSENT;
    switch (name) {
      case 'sum': return num(values.reduce((a, b) => a + b, 0), series.dim, series.unit);
      case 'mean': return num(values.reduce((a, b) => a + b, 0) / values.length, series.dim, series.unit);
      case 'min': return num(Math.min(...values), series.dim, series.unit);
      case 'max': return num(Math.max(...values), series.dim, series.unit);
      case 'last': return num(values[values.length - 1], series.dim, series.unit);
    }
  }

  switch (name) {
    case 'min':
    case 'max': {
      const present = numericArgs(name, vals);
      if (present.length === 0) return ABSENT;
      const best = present.reduce((a, b) => (name === 'min' ? baseValue(b) < baseValue(a) : baseValue(b) > baseValue(a)) ? b : a);
      return num(best.value, best.dim, best.unit);
    }
    case 'abs': {
      const [v] = numericArgs(name, vals, 1);
      return num(Math.abs(v.value), v.dim, v.unit);
    }
    case 'round': {
      const [v, d] = numericArgs(name, vals);
      const decimals = d ? d.value : 0;
      const f = 10 ** decimals;
      return num(Math.round(v.value * f) / f, v.dim, v.unit);
    }
    case 'floor': {
      const [v] = numericArgs(name, vals, 1);
      return num(Math.floor(v.value), v.dim, v.unit);
    }
    case 'ceil': {
      const [v] = numericArgs(name, vals, 1);
      return num(Math.ceil(v.value), v.dim, v.unit);
    }
    case 'clamp': {
      const [v, lo, hi] = numericArgs(name, vals, 3);
      return num(Math.min(Math.max(v.value, lo.value), hi.value), v.dim, v.unit);
    }
  }

  const extended = ctx.callFunction?.(name, vals, args);
  if (extended !== undefined) return extended;
  throw new CalcEvalError(`Unknown function: ${name}`);
}

const AGGREGATE_NAMES: Record<string, true> = { sum: true, max: true, min: true, avg: true, count: true, last: true };

/** Trailing window over a series' day domain; missing days count as 0. */
function windowMap(
  name: string,
  series: Extract<Val, { kind: 'series' }>,
  period: number,
): Val {
  const loadAt = (day: number): number => series.points.get(day) ?? 0;
  const points = new Map<number, number>();
  for (const day of series.points.keys()) {
    let sum = 0;
    for (let k = 0; k < period; k++) sum += loadAt(day - k);
    if (name === 'windowSum') {
      points.set(day, sum);
      continue;
    }
    const mean = sum / period;
    if (name === 'windowMean') {
      points.set(day, mean);
      continue;
    }
    // windowSd: population SD (÷n), matching workloadRollup.
    let variance = 0;
    for (let k = 0; k < period; k++) {
      const diff = loadAt(day - k) - mean;
      variance += diff * diff;
    }
    points.set(day, Math.sqrt(variance / period));
  }
  return { kind: 'series', points, dim: series.dim, unit: series.unit };
}

/** convert()'s second argument is a unit symbol, not a value to resolve. */
function unitArg(node: ExprNode): string {
  if (node.kind === 'ref') return node.name;
  if (node.kind === 'string') return node.value;
  throw new CalcEvalError('convert() target unit must be a unit name');
}

/**
 * Extract numeric args, dropping absent values. With `exact`, arity and
 * presence are enforced (unary math can't skip); without it (min/max),
 * absent args are ignored so partial data still yields a value.
 */
function numericArgs(
  name: string,
  vals: Val[],
  exact?: number,
): Extract<Val, { kind: 'number' }>[] {
  const out: Extract<Val, { kind: 'number' }>[] = [];
  for (const v of vals) {
    if (v.kind === 'absent') continue;
    if (v.kind !== 'number') throw new CalcEvalError(`${name}() requires numeric arguments`);
    out.push(v);
  }
  if (exact !== undefined) {
    if (vals.length !== exact || out.length !== exact) {
      throw new CalcEvalError(`${name}() needs ${exact} numeric argument(s), got ${out.length}`);
    }
  }
  return out;
}
