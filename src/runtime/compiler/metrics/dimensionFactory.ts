import type { Dimension } from '../../core/metrics/units';
import { DistanceMetric } from './DistanceMetric';
import { ResistanceMetric } from './ResistanceMetric';
import { MeasuredMetric } from './MeasuredMetric';
import type { IMetric } from '../../core/models/Metric';

/**
 * EMPTY_UNIT — the @N empty-unit sentinel.
 *
 * The parser emits a bare number with `@` (e.g. `@5`) as a `ResistanceMetric`
 * whose unit slot is this empty string; the base Units Dialect later fills
 * it (e.g. `@5 kg` → `ResistanceMetric(5, 'kg')`). ClimbDialect also reads the
 * sentinel to detect climb attempt counts. S5c gives the sentinel one named
 * home so the three sites (emit, fuse, read) reference the same constant
 * rather than a duplicated empty-string literal.
 */
export const EMPTY_UNIT = '';

/**
 * Dimension → metric class mapping — the single home for "what is a length
 * at runtime."
 *
 * Length and mass map to their dedicated classes (analytics depends on them);
 * every other dimension uses the generic {@link MeasuredMetric}. The stored
 * unit is the token *as written* (`miles`), not the canonical spelling, to
 * preserve display fidelity.
 *
 * This used to live inside `fuseUnits.metricForUnit` (the caller + the
 * mapping co-located); S5c co-locates the mapping with the metric classes it
 * instantiates, so adding a new dimension→metric pair is a one-file change
 * next to the classes themselves.
 */
export function metricForDimension(
    amount: number | undefined,
    token: string,
    dimension: Dimension,
): IMetric {
    switch (dimension) {
        case 'length':
            return new DistanceMetric(amount, token);
        case 'mass':
            return new ResistanceMetric(amount, token);
        default:
            return new MeasuredMetric(amount, token, dimension);
    }
}
