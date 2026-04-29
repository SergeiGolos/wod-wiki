import { MetricType, IMetric, MetricOrigin } from '../models/Metric';
import { MetricFilter } from '../contracts/IMetricSource';

/**
 * Maps each MetricOrigin to its precedence tier.
 * Lower number = higher precedence.
 *
 * Tier 0: user / collected — explicitly provided by the user
 * Tier 1: runtime / tracked / analyzed — generated during execution
 * Tier 2: compiler / hinted — synthesized during compilation
 * Tier 3: parser — parsed from source text (the "plan")
 */
export const ORIGIN_PRECEDENCE: Record<MetricOrigin, number> = {
    'execution': 0,
    'user': 0,
    'collected': 0,
    'runtime': 1,
    'tracked': 1,
    'analyzed': 1,
    'compiler': 2,
    'dialect':  2,
    'hinted':   2,
    'parser': 3,
};

/**
 * Selects metrics from the highest-precedence (lowest rank) tier.
 *
 * Given a list of metrics (all of the same MetricType), returns only
 * those from the tier with the best (lowest) precedence rank. If multiple
 * metrics share the winning tier, ALL are returned to support multi-
 * metric-per-type semantics (e.g., rep scheme 21-15-9).
 *
 * @param metrics Fragments of a single MetricType
 * @returns The subset from the winning precedence tier
 */
export function selectBestTier(metrics: IMetric[]): IMetric[] {
    let bestRank = Infinity;
    let best: IMetric[] = [];

    for (const f of metrics) {
        const rank = ORIGIN_PRECEDENCE[f.origin ?? 'parser'] ?? 3;
        if (rank < bestRank) {
            bestRank = rank;
            best = [f];
        } else if (rank === bestRank) {
            best.push(f);
        }
    }

    return best;
}

/**
 * Standard metrics precedence resolution algorithm.
 *
 * Rules:
 * 1. Apply optional type/origin/exclude filters
 * 2. Group remaining metrics by MetricType
 * 3. Within each type, select the highest-precedence tier
 * 4. If multiple metrics exist in the winning tier, keep ALL of them
 * 5. Concatenate results across types, preserving insertion order
 *
 * @param metrics Raw metrics to resolve
 * @param filter Optional filter to restrict results
 * @returns Precedence-resolved, display-ready metrics
 */
export function resolveMetricPrecedence(
    metrics: IMetric[],
    filter?: MetricFilter
): IMetric[] {
    // Step 1: Apply filters
    let filtered = metrics;
    if (filter) {
        if (filter.origins) {
            filtered = filtered.filter(f => filter.origins!.includes(f.origin ?? 'parser'));
        }
        if (filter.types) {
            filtered = filtered.filter(f => filter.types!.includes(f.type));
        }
        if (filter.excludeTypes) {
            filtered = filtered.filter(f => !filter.excludeTypes!.includes(f.type));
        }
    }

    // Suppress: collect types marked for suppression, then remove both the
    // sentinel and all other metrics of that type from the display result.
    const suppressedTypes = new Set(
        filtered.filter(m => m.action === 'suppress').map(m => m.type)
    );
    filtered = filtered.filter(m =>
        m.action !== 'suppress' && !suppressedTypes.has(m.type)
    );

    // Step 2: Group by MetricType
    const byType = new Map<MetricType, IMetric[]>();
    for (const f of filtered) {
        const group = byType.get(f.type) ?? [];
        group.push(f);
        byType.set(f.type, group);
    }

    // Step 3: For each type, take highest-precedence tier
    const result: IMetric[] = [];
    for (const [, typeFragments] of byType) {
        result.push(...selectBestTier(typeFragments));
    }

    return result;
}
