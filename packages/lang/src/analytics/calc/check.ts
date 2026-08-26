/**
 * Static dimension checking, run at calc registration time (spec §5).
 *
 * Walks an expression computing dimension vectors: `*` adds, `/` subtracts,
 * `+`/`-`/comparisons require equal vectors (numeric literal 0 is polymorphic
 * so `elapsed > 0` passes), `convert()` targets must match the source
 * vector. Declared output units must match the computed vector unless the
 * unit is `auto` or a named zero-vector authoritative cast (AU, pts,
 * MET-min, ratio). Any mismatch or unknown symbol is a registration error —
 * bad calcs never reach the evaluator.
 */

import { CalcLine, ExprNode } from './ast';
import { addDim, subDim, dimEquals, DimVector, DIM_ZERO, formatDim } from './dimensions';
import { AUTHORITATIVE_CASTS, getUnit } from './units';

export class CalcRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalcRegistrationError';
  }
}

export interface StaticEnv {
  /** Dimension of a ref atom; undefined → unknown symbol error. */
  refDim(name: string): DimVector | undefined;
  /** Dimension of an extension function result (aggregates, lookup fields). */
  callDim?(name: string, argDims: (DimVector | undefined)[]): DimVector | undefined;
  /** Dimension of a lookup() table field; undefined → unknown table/field. */
  lookupDim?(table: string, field: string): DimVector | undefined;
  /** Dimension of a WQL selection result; defaults to dimensionless. */
  wqlDim?(node: Extract<ExprNode, { kind: 'wql' }>): DimVector | undefined;
}

/** Infer the dimension vector of an expression, throwing on any violation. */
export function inferDim(node: ExprNode, env: StaticEnv): DimVector {
  switch (node.kind) {
    case 'literal':
      return DIM_ZERO;
    case 'period':
      return DIM_ZERO;
    case 'string':
      return DIM_ZERO;
    case 'filter':
      return DIM_ZERO;
    case 'ref': {
      const dim = env.refDim(node.name);
      if (!dim) throw new CalcRegistrationError(`Unknown symbol: ${node.name}`);
      return dim;
    }
    case 'wql':
      return env.wqlDim?.(node) ?? DIM_ZERO;
    case 'unary':
      return node.op === 'not' ? DIM_ZERO : inferDim(node.arg, env);
    case 'binary': {
      const { op } = node;
      if (op === 'and' || op === 'or') {
        inferDim(node.left, env);
        inferDim(node.right, env);
        return DIM_ZERO;
      }
      if (op === '*') return addDim(inferDim(node.left, env), inferDim(node.right, env));
      if (op === '/') return subDim(inferDim(node.left, env), inferDim(node.right, env));
      const l = comparableDim(node.left, env);
      const r = comparableDim(node.right, env);
      if (l && r && !dimEquals(l, r)) {
        throw new CalcRegistrationError(
          `Dimension mismatch for '${op}': ${formatDim(l)} vs ${formatDim(r)}`,
        );
      }
      return op === '+' || op === '-' ? (l ?? DIM_ZERO) : DIM_ZERO;
    }
    case 'call':
      return inferCallDim(node, env);
  }
}

/** Zero literal adopts the other side's vector (`elapsed > 0` idiom). */
function comparableDim(node: ExprNode, env: StaticEnv): DimVector | undefined {
  if (node.kind === 'literal' && node.value === 0) return undefined;
  return inferDim(node, env);
}

function literalString(node: ExprNode): string | undefined {
  return node.kind === 'string' ? node.value : undefined;
}

function inferCallDim(node: Extract<ExprNode, { kind: 'call' }>, env: StaticEnv): DimVector {
  const { name, args } = node;
  if (name === 'has') return DIM_ZERO;
  if (name === 'convert') {
    if (args.length !== 2) throw new CalcRegistrationError('convert() takes (value, targetUnit)');
    const target = args[1];
    const unitName = target.kind === 'ref' ? target.name : target.kind === 'string' ? target.value : undefined;
    const unit = unitName === undefined ? undefined : getUnit(unitName);
    if (!unitName || !unit) {
      throw new CalcRegistrationError('convert() target must be a known unit name');
    }
    const src = inferDim(args[0], env);
    if (!dimEquals(src, unit.dim)) {
      throw new CalcRegistrationError(
        `convert(x, ${unitName}) dimension mismatch: ${formatDim(src)} is not ${formatDim(unit.dim)}`,
      );
    }
    return unit.dim;
  }
  if (name === 'min' || name === 'max' || name === 'clamp') {
    let dim: DimVector | undefined;
    for (const arg of args) {
      const d = inferDim(arg, env);
      if (dim && !dimEquals(dim, d)) {
        throw new CalcRegistrationError(`${name}() arguments have mismatched dimensions`);
      }
      dim = d;
    }
    if (!dim) throw new CalcRegistrationError(`${name}() requires at least one argument`);
    return dim;
  }
  if (name === 'abs' || name === 'round' || name === 'floor' || name === 'ceil') {
    if (args.length < 1) throw new CalcRegistrationError(`${name}() requires an argument`);
    return inferDim(args[0], env);
  }
  if (name === 'windowMean' || name === 'windowSum' || name === 'windowSd' || name === 'windowEwma') {
    if (args.length !== 2) throw new CalcRegistrationError(`${name}() takes (series, period)`);
    return inferDim(args[0], env);
  }
  if (name === 'lookup') {
    if (args.length !== 3) throw new CalcRegistrationError('lookup() takes (table, key, field)');
    const table = literalString(args[0]);
    const field = literalString(args[2]);
    if (!table || !field) {
      throw new CalcRegistrationError('lookup() table and field must be string literals');
    }
    inferDim(args[1], env); // key expression must still check
    const dim = env.lookupDim?.(table, field);
    if (!dim) throw new CalcRegistrationError(`Unknown lookup field: ${table}.${field}`);
    return dim;
  }
  const argDims = args.map((a) => (a.kind === 'filter' ? DIM_ZERO : inferDim(a, env)));
  const dim = env.callDim?.(name, argDims);
  if (!dim) throw new CalcRegistrationError(`Unknown function: ${name}`);
  return dim;
}

/**
 * Validate a parsed calc line's declared output unit against the computed
 * vector. `auto` always passes; authoritative casts override; anything else
 * must match exactly.
 */
export function validateOutputUnit(exprDim: DimVector, unit: string | undefined): void {
  if (!unit || unit === 'auto') return;
  if (AUTHORITATIVE_CASTS[unit]) return;
  const def = getUnit(unit);
  if (!def) throw new CalcRegistrationError(`Unknown output unit: ${unit}`);
  if (!dimEquals(def.dim, exprDim)) {
    throw new CalcRegistrationError(
      `Declared unit ${unit} (${formatDim(def.dim)}) does not match expression dimension ${formatDim(exprDim)}`,
    );
  }
}

/** Full registration-time check for one calc line. Returns the computed vector. */
export function checkCalcLine(line: CalcLine, env: StaticEnv): DimVector {
  const dim = inferDim(line.expr, env);
  if (line.when) inferDim(line.when, env);
  validateOutputUnit(dim, line.unit);
  return dim;
}
