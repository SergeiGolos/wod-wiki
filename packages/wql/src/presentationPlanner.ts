/**
 * INTEGRATION STATUS (wayfinder): intentionally unwired — no production
 * consumer yet. Wiring is the open item of wayfinder ticket 23 (widget/planner consumption); do not
 * delete these exports (they are the tested deliverable awaiting cutover).
 * Presentation planner (wayfinder decision 23): the explicit product rules
 * for how widgets consume structured query results.
 *
 * Rule 1 — scalar endpoints: every scalar-reducing widget (value, bar,
 * toplist, stacked-bar) takes the LAST point of its series; the planner
 * accepts an explicit endpoint override. The `?? 0` conflation dies here:
 * absent renders as absent (undefined), zero only when recorded zero.
 *
 * Rule 2 — scatter: paired-only display (explicit graph-presentation
 * contract amendment). Positions where only one series observed stay in the
 * view model, flagged partial, but plot nothing. Zero-fill display applies
 * to time-axis charts only; multi-axis timeseries keeps per-series zero-fill
 * on the shared real time axis (renderer-side, not this planner).
 *
 * Rule 3 — provenance boundary: synthetic points exist for display only and
 * never re-enter statistics; `corr` remains paired-only regardless of
 * display decisions (enforced in the formula evaluator, ticket 17).
 */

export type ScalarEndpoint = 'first' | 'last';

/**
 * Reduce a series to its scalar endpoint. Absent stays absent: an empty
 * series (or a point whose value is null/undefined) yields undefined —
 * never a synthesized zero.
 */
export function resolveScalarEndpoint<T>(
    series: readonly T[],
    endpoint: ScalarEndpoint = 'last',
): T | undefined {
    if (series.length === 0) return undefined;
    const value = endpoint === 'last' ? series[series.length - 1] : series[0];
    if (value === null || value === undefined) return undefined;
    return value;
}

export interface ScatterPosition<A, B> {
    a: A | undefined;
    b: B | undefined;
}

export interface ScatterViewPoint<A, B> {
    a: A;
    b: B;
}

export interface ScatterPartialPoint<A, B> {
    a: A | undefined;
    b: B | undefined;
}

export interface ScatterViewModel<A, B> {
    /** Positions where BOTH series observed — the only ones that plot. */
    paired: Array<ScatterViewPoint<A, B>>;
    /** One-sided positions — visible in the view model, flagged, plot nothing. */
    partials: Array<ScatterPartialPoint<A, B>>;
}

/**
 * Scatter paired-only display (decision 23, rule 2): positions where both
 * series have observed values plot; one-sided positions are retained and
 * flagged rather than zero-filled or dropped silently.
 */
export function scatterPairedOnly<A, B>(
    positions: ReadonlyArray<ScatterPosition<A, B>>,
): ScatterViewModel<A, B> {
    const paired: Array<ScatterViewPoint<A, B>> = [];
    const partials: Array<ScatterPartialPoint<A, B>> = [];
    for (const position of positions) {
        if (position.a !== undefined && position.a !== null && position.b !== undefined && position.b !== null) {
            paired.push({ a: position.a, b: position.b });
        } else {
            partials.push({ a: position.a, b: position.b });
        }
    }
    return { paired, partials };
}
