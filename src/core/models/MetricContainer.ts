import { IMetric, MetricType, MetricOrigin } from './Metric';
import { MetricFilter } from '../contracts/IMetricSource';
import { resolveMetricPrecedence, ORIGIN_PRECEDENCE } from '../utils/metricPrecedence';

/**
 * MetricContainer — a typed collection for `IMetric` objects.
 *
 * Provides lookup, add, remove, merge, and iteration operations over a
 * flat `IMetric[]` array. Intended as the standard way to work with
 * metric collections on `ICodeStatement`, `IRuntimeBlock`, and
 * `OutputStatement`. Immutable-friendly: mutating methods return `this`
 * for chaining; non-mutating projections return new arrays.
 *
 * @example
 * ```ts
 * const c = MetricContainer.from(statement.metrics);
 * const reps = c.getByType(MetricType.Rep);
 * c.add({ metricType: MetricType.Effort, type: 'effort', value: 'Run' });
 * const merged = c.merge(otherContainer);
 * ```
 */
export class MetricContainer implements Iterable<IMetric> {
    private _metrics: IMetric[];

    // ── Construction ───────────────────────────────────────────

    constructor(metrics?: IMetric[]) {
        this._metrics = metrics ? [...metrics] : [];
    }

    /** Create a container from an existing metric array. */
    static from(metrics: IMetric[]): MetricContainer {
        return new MetricContainer(metrics);
    }

    /** Create an empty container. */
    static empty(): MetricContainer {
        return new MetricContainer();
    }

    // ── Read ───────────────────────────────────────────────────

    /** All metrics in insertion order. Returns a defensive copy. */
    get all(): readonly IMetric[] {
        return [...this._metrics];
    }

    /** Number of metrics in the container. */
    get length(): number {
        return this._metrics.length;
    }

    /** Whether the container has no metrics. */
    get isEmpty(): boolean {
        return this._metrics.length === 0;
    }

    /**
     * Get all metrics of a given MetricType, sorted by origin precedence
     * (best first).
     */
    getByType(type: MetricType): IMetric[] {
        const ofType = this._metrics.filter(m => m.type === type);
        if (ofType.length <= 1) return ofType;
        return [...ofType].sort((a, b) => {
            const rankA = ORIGIN_PRECEDENCE[a.origin ?? 'parser'] ?? 3;
            const rankB = ORIGIN_PRECEDENCE[b.origin ?? 'parser'] ?? 3;
            return rankA - rankB;
        });
    }

    /**
     * Get the highest-precedence metric of a given type, or undefined.
     */
    getFirst(type: MetricType): IMetric | undefined {
        const byType = this.getByType(type);
        return byType.length > 0 ? byType[0] : undefined;
    }

    /** Whether any metric of the given type exists. */
    has(type: MetricType): boolean {
        return this._metrics.some(m => m.type === type);
    }

    /**
     * Get all metrics matching the given origin.
     */
    getByOrigin(origin: MetricOrigin): IMetric[] {
        return this._metrics.filter(m => (m.origin ?? 'parser') === origin);
    }

    /**
     * Apply the standard precedence resolution algorithm.
     *
     * Groups metrics by type, selects the best-origin tier for each type,
     * and optionally applies a MetricFilter.
     */
    resolve(filter?: MetricFilter): IMetric[] {
        return resolveMetricPrecedence([...this._metrics], filter);
    }

    // ── Write (mutating, returns `this` for chaining) ──────────

    /** Append one or more metrics. */
    add(...metrics: IMetric[]): this {
        this._metrics.push(...metrics);
        return this;
    }

    /**
     * Remove metrics matching a predicate.
     * Returns the removed metrics.
     */
    remove(predicate: (m: IMetric) => boolean): IMetric[] {
        const removed: IMetric[] = [];
        this._metrics = this._metrics.filter(m => {
            if (predicate(m)) {
                removed.push(m);
                return false;
            }
            return true;
        });
        return removed;
    }

    /**
     * Remove all metrics of a given type.
     * Returns the removed metrics.
     */
    removeByType(type: MetricType): IMetric[] {
        return this.remove(m => m.type === type);
    }

    /** Remove all metrics. */
    clear(): this {
        this._metrics = [];
        return this;
    }

    /**
     * Replace all metrics of a given type with new ones.
     * Equivalent to `removeByType(type)` + `add(...replacements)`.
     * Returns the removed metrics.
     */
    replaceByType(type: MetricType, ...replacements: IMetric[]): IMetric[] {
        const removed = this.removeByType(type);
        this._metrics.push(...replacements);
        return removed;
    }

    // ── Merge ──────────────────────────────────────────────────

    /**
     * Merge another container (or raw array) into this one.
     *
     * For each MetricType present in the incoming metrics:
     * - If the incoming metric's origin has higher precedence (lower rank)
     *   than existing metrics of that type, the existing ones are replaced.
     * - If equal precedence, the incoming metrics are appended
     *   (multi-metric-per-type: e.g. rep scheme 21-15-9).
     * - If lower precedence, the incoming metrics are ignored.
     *
     * Returns `this` for chaining.
     */
    merge(other: MetricContainer | IMetric[]): this {
        const incoming = other instanceof MetricContainer ? other._metrics : other;

        // Group incoming by MetricType
        const byType = new Map<MetricType, IMetric[]>();
        for (const m of incoming) {
            const group = byType.get(m.type) ?? [];
            group.push(m);
            byType.set(m.type, group);
        }

        for (const [type, incomingGroup] of byType) {
            const existing = this._metrics.filter(m => m.type === type);

            if (existing.length === 0) {
                // No existing metrics of this type — add all incoming
                this._metrics.push(...incomingGroup);
                continue;
            }

            const existingRank = Math.min(
                ...existing.map(m => ORIGIN_PRECEDENCE[m.origin ?? 'parser'] ?? 3)
            );
            const incomingRank = Math.min(
                ...incomingGroup.map(m => ORIGIN_PRECEDENCE[m.origin ?? 'parser'] ?? 3)
            );

            if (incomingRank < existingRank) {
                // Incoming has better precedence — replace existing
                this._metrics = this._metrics.filter(m => m.type !== type);
                this._metrics.push(...incomingGroup);
            } else if (incomingRank === existingRank) {
                // Same precedence — append (multi-metric-per-type)
                this._metrics.push(...incomingGroup);
            }
            // Lower precedence — ignore incoming
        }

        return this;
    }

    // ── Iteration / Projection ─────────────────────────────────

    /** Iterate over all metrics. */
    [Symbol.iterator](): Iterator<IMetric> {
        return this._metrics[Symbol.iterator]();
    }

    /** Filter metrics, returning a new array. */
    filter(predicate: (m: IMetric) => boolean): IMetric[] {
        return this._metrics.filter(predicate);
    }

    /** Map metrics to a new array. */
    map<T>(fn: (m: IMetric, index: number) => T): T[] {
        return this._metrics.map(fn);
    }

    /** Find the first metric matching a predicate. */
    find(predicate: (m: IMetric) => boolean): IMetric | undefined {
        return this._metrics.find(predicate);
    }

    /** Whether any metric matches the predicate. */
    some(predicate: (m: IMetric) => boolean): boolean {
        return this._metrics.some(predicate);
    }

    /** Whether all metrics match the predicate (vacuously true if empty). */
    every(predicate: (m: IMetric) => boolean): boolean {
        return this._metrics.every(predicate);
    }

    // ── Conversion ─────────────────────────────────────────────

    /** Return a mutable copy of the underlying array. */
    toArray(): IMetric[] {
        return [...this._metrics];
    }

    /** Spread-friendly: returns the underlying array (no copy). */
    get raw(): IMetric[] {
        return this._metrics;
    }

    /** Useful for debugging. */
    toString(): string {
        return `MetricContainer(${this._metrics.length})[${
            this._metrics.map(m => m.type).join(', ')
        }]`;
    }
}
