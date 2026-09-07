/**
 * Contribution selection — grain integrity and coverage (wayfinder
 * datadog-analytics ticket 16, per the automatic grain contract).
 *
 * Coverage is chosen within each workout/result and typed metric — never by
 * an `any attributed record exists` check over the whole query:
 *
 * - Detail observations and substitute summaries of the same population are
 *   duplicate representations: only one is aggregated (detail wins).
 * - A summary with a coverage partition (effort / group tags) disjoint from
 *   the present detail substitutes exactly for its uncovered partition —
 *   provided its retained statistics answer the requested operation.
 * - A retained population represented only by an insufficient summary
 *   reports insufficient evidence — never an invented observation.
 * - Explicit grain filters are hard source constraints and report
 *   limitations rather than silently switching representation.
 */

import type { AnalyticsDataPoint, ReducerStats, SummaryCoverage } from '@bitcobblers/wod-wiki-core';
import type { Aggregator } from './wql';

/** Compact coverage references carried on aggregate results (ticket 16
 *  explainability; ticket 18's drill-down consumes the on-demand detail). */
export interface CoverageReport {
    /** (resultId, metric) populations selected as detail observations. */
    detailPopulations: number;
    /** Substitute summaries that answered the requested operation. */
    selectedSummaries: Array<{ resultId: string; metricKey: string; coverage?: SummaryCoverage }>;
    /** Duplicate representations dropped because detail covered them. */
    ignoredDuplicates: Array<{ resultId: string; metricKey: string; id: string }>;
    /** Populations that could not answer the operation — reported, never
     *  silently omitted and never fabricated. */
    insufficientScopes: Array<{ resultId: string; metricKey: string; reason: string }>;
}

/** The partition a representation covers — effort + group-tag identity. */
function partitionKey(coverage: SummaryCoverage | undefined, effortSlug: string | undefined): string {
    const tags = coverage?.groupTags
        ? Object.entries(coverage.groupTags).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join(',')
        : '';
    return `${coverage?.effortSlug ?? effortSlug ?? ''}|${tags}`;
}

/** Whether the retained statistics answer the requested operation. */
function statsSufficient(stats: ReducerStats | undefined, agg: Aggregator): boolean {
    if (!stats) {
        // A summary VALUE is itself the normalized total: sum-shaped and
        // endpoint aggregations are answerable from the value alone
        // (delta's two-observation rule is enforced by the reducer).
        return agg === 'sum' || agg === 'min' || agg === 'max' || agg === 'last' || agg === 'delta';
    }
    switch (agg) {
        case 'sum':
        case 'min':
        case 'max':
        case 'last':
            return true;
        case 'avg':
        case 'count':
            return typeof stats.observedCount === 'number';
        case 'delta':
            // Each summary contributes its value as one observation at its
            // metric date; the <2-observation rule is enforced by the
            // reducer (absent, not insufficient).
            return true;
    }
}

export interface CoverageSelection {
    /** Facts to aggregate — one complete, non-overlapping representation. */
    selected: AnalyticsDataPoint[];
    report: CoverageReport;
}

/**
 * Coverage-based selection over the matched facts of one aggregate query.
 * Groups by (resultId, metricKey); within a group picks detail over
 * substituting summaries, admits only disjoint summary partitions, and
 * reports insufficient evidence instead of fabricating values.
 */
export function selectContributions(
    matched: readonly AnalyticsDataPoint[],
    agg: Aggregator,
): CoverageSelection {
    const report: CoverageReport = {
        detailPopulations: 0,
        selectedSummaries: [],
        ignoredDuplicates: [],
        insufficientScopes: [],
    };
    const selected: AnalyticsDataPoint[] = [];

    // Population = one result × one metric key.
    const populations = new Map<string, AnalyticsDataPoint[]>();
    for (const fact of matched) {
        const key = `${fact.resultId}\u0000${fact.metricKey ?? fact.type}`;
        const bucket = populations.get(key);
        if (bucket) bucket.push(fact);
        else populations.set(key, [fact]);
    }

    for (const [populationKey, facts] of populations) {
        const [resultId, metricKey] = populationKey.split('\u0000');
        // Direct observations are detail regardless of storage grain —
        // user-recorded summary-grain values (wellness) are genuine
        // observations, not substitutes.
        const detail = facts.filter(
            (f) => f.grain !== 'summary' || f.representationKind === 'direct',
        );
        const summaries = facts.filter((f) => f.grain === 'summary');

        if (detail.length > 0) {
            report.detailPopulations += 1;
            selected.push(...detail);
            // Summaries whose coverage partition is already answered by the
            // detail are duplicate representations. A partition disjoint
            // from every detail observation substitutes for its partition.
            const detailPartitions = new Set(detail.map((f) => partitionKey(undefined, f.effortSlug)));
            for (const summary of summaries) {
                const summaryPartition = partitionKey(summary.summaryCoverage, summary.effortSlug);
                if (summaryPartition !== '|'
                    && summary.summaryCoverage !== undefined
                    && !detailPartitions.has(summaryPartition)
                    && statsSufficient(summary.reducerStats, agg)) {
                    report.selectedSummaries.push({ resultId, metricKey, coverage: summary.summaryCoverage });
                    selected.push(summary);
                } else {
                    report.ignoredDuplicates.push({ resultId, metricKey, id: summary.id });
                }
            }
            continue;
        }

        // Summaries only: every summary is a candidate substitute; each must
        // individually prove it answers the operation.
        let anyUsable = false;
        for (const summary of summaries) {
            if (statsSufficient(summary.reducerStats, agg)) {
                report.selectedSummaries.push({ resultId, metricKey, coverage: summary.summaryCoverage });
                selected.push(summary);
                anyUsable = true;
            }
        }
        if (!anyUsable) {
            report.insufficientScopes.push({
                resultId,
                metricKey,
                reason: agg === 'avg' || agg === 'count' || agg === 'delta'
                    ? 'summary lacks the retained observation count this operation requires'
                    : 'no detail rows and no sufficient summary for this population',
            });
        }
    }

    return { selected, report };
}

/**
 * Dedupe facts by stable observation identity — overlapping scope fetches
 * (note feed + explicit result:, content joins) contribute each observation
 * once. Repeated same-valued measurements keep their distinct ids.
 */
export function dedupeById<T extends { id: string }>(facts: readonly T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const fact of facts) {
        if (seen.has(fact.id)) continue;
        seen.add(fact.id);
        out.push(fact);
    }
    return out;
}
