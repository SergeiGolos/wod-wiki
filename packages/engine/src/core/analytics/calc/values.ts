/**
 * Dimension-aware value model for calc evaluation.
 *
 * Numbers carry a dimension vector and (optionally) the unit they were
 * measured in; arithmetic tracks vectors per spec §5.1. `absent` is the
 * missing-data value: it propagates through arithmetic, reads as `false` in
 * predicates (applicability decision, #848), and is what `has()` probes.
 */

import { DimVector, DIM_ZERO } from './dimensions';

export type Val =
  | { kind: 'number'; value: number; dim: DimVector; unit?: string }
  | { kind: 'string'; value: string }
  | { kind: 'series'; points: Map<number, number>; dim: DimVector; unit?: string }
  | { kind: 'period'; days: number }
  | { kind: 'absent' };

export const ABSENT: Val = { kind: 'absent' };

export function num(value: number, dim: DimVector = DIM_ZERO, unit?: string): Val {
  return { kind: 'number', value, dim, unit };
}

export function str(value: string): Val {
  return { kind: 'string', value };
}

/** Predicate truthiness: absent → false; numbers → ≠ 0; strings → non-empty. */
export function truthy(v: Val): boolean {
  if (v.kind === 'number') return v.value !== 0;
  if (v.kind === 'string') return v.value.length > 0;
  if (v.kind === 'series') return v.points.size > 0;
  if (v.kind === 'period') return v.days > 0;
  return false;
}
