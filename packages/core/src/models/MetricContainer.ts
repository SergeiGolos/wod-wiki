import { IMetric, MetricType, MetricOrigin } from './Metric';
import type { IMetricSource, MetricFilter } from '../contracts/IMetricSource';
import { OwnershipResolver, ownershipRank } from '../ownership/OwnershipResolver';

/**
 * MetricContainer — a typed collection for `IMetric` objects.
 *
 * Provides lookup, add, remove, merge, and iteration operations over a
 * flat `IMetric[]` array. Standard way to work with metric collections on
 * `ICodeStatement`, `IRuntimeBlock`, and `OutputStatement`.
 *
 * Numeric indexes are mirrored for backwards compatibility with legacy
 * `metrics[0]` call sites.
 */
export class MetricContainer implements IMetricSource, Iterable<IMetric> {
  [index: number]: IMetric;
  private _metrics: IMetric[];
  private _indexedLength = 0;
  private readonly _resolver = new OwnershipResolver();
  readonly id: string | number;

  // ── Construction ───────────────────────────────────────────

  constructor(metrics?: IMetric[] | MetricContainer, id: string | number = 'metrics') {
    this.id = id;
    if (metrics instanceof MetricContainer) {
      this._metrics = metrics.toArray();
      this.syncIndexProperties();
      return;
    }
    if (Array.isArray(metrics)) {
      this._metrics = [...metrics];
    } else if (metrics != null) {
      this._metrics = [];
    } else {
      this._metrics = [];
    }
    this.syncIndexProperties();
  }

  /**
   * Create a container from an existing metric array, MetricContainer, or
   * a deserialized plain object.
   */
  static from(
    metrics: IMetric[] | MetricContainer | undefined | unknown,
    id: string | number = 'metrics',
  ): MetricContainer {
    if (metrics instanceof MetricContainer) {
      return metrics.clone(id);
    }
    if (Array.isArray(metrics)) {
      return new MetricContainer(metrics, id);
    }
    if (metrics != null && typeof metrics === 'object' && '_metrics' in (metrics as object)) {
      const raw = (metrics as Record<string, unknown>)._metrics;
      if (Array.isArray(raw)) {
        return new MetricContainer(raw as IMetric[], id);
      }
    }
    return MetricContainer.empty(id);
  }

  /** Create an empty container. */
  static empty(id: string | number = 'metrics'): MetricContainer {
    return new MetricContainer(undefined, id);
  }

  /** Create a defensive copy of this container. */
  clone(id: string | number = this.id): MetricContainer {
    return new MetricContainer(this._metrics, id);
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

  /** Alias for length */
  get size(): number {
    return this._metrics.length;
  }

  /** Whether the container has no metrics. */
  get isEmpty(): boolean {
    return this._metrics.length === 0;
  }

  /**
   * Get all metrics of a given MetricType / name, sorted by ownership layer
   * (highest precedence first).
   */
  getByType(type: MetricType | string): IMetric[] {
    const ofType = this._metrics.filter((m) => m.type === type || m.name === type);
    if (ofType.length <= 1) return ofType;
    return [...ofType].sort((a, b) => ownershipRank(b) - ownershipRank(a));
  }

  /**
   * Get the highest-precedence metric of a given type/name, or undefined.
   */
  getFirst(type: MetricType | string): IMetric | undefined {
    const byType = this.getByType(type);
    return byType.length > 0 ? byType[0] : undefined;
  }

  /**
   * Lookup a metric by type or name.
   */
  get(type: MetricType | string): IMetric | undefined {
    return this.getFirst(type);
  }

  /** Whether any metric of the given type/name exists. */
  has(type: MetricType | string): boolean {
    return this._metrics.some((m) => m.type === type || m.name === type);
  }

  hasMetric(type: MetricType | string): boolean {
    return this.has(type);
  }

  getDisplayMetrics(filter?: MetricFilter): IMetric[] {
    return this.resolve(filter);
  }

  getMetric(type: MetricType | string): IMetric | undefined {
    return this._resolver.resolveOne(this._metrics, type);
  }

  getAllMetricsByType(type: MetricType | string): IMetric[] {
    return this.getByType(type);
  }

  get rawMetrics(): IMetric[] {
    return this.toArray();
  }

  getAll(): IMetric[] {
    return this.toArray();
  }

  /**
   * Get all metrics matching the given origin.
   */
  getByOrigin(origin: MetricOrigin): IMetric[] {
    return this._metrics.filter((m) => (m.origin ?? 'parser') === origin);
  }

  /**
   * Apply the standard precedence resolution algorithm.
   */
  resolve(filter?: MetricFilter): IMetric[] {
    return this._resolver.resolve(this._metrics, filter);
  }

  // ── Write (mutating, returns `this` for chaining) ──────────

  /** Append one or more metrics. */
  add(...metrics: IMetric[]): this {
    this._metrics.push(...metrics);
    this.syncIndexProperties();
    return this;
  }

  /**
   * Remove metrics matching a predicate.
   * Returns the removed metrics.
   */
  remove(predicate: (m: IMetric) => boolean): IMetric[] {
    const removed: IMetric[] = [];
    this._metrics = this._metrics.filter((m) => {
      if (predicate(m)) {
        removed.push(m);
        return false;
      }
      return true;
    });
    this.syncIndexProperties();
    return removed;
  }

  /**
   * Remove all metrics of a given type.
   * Returns the removed metrics.
   */
  removeByType(type: MetricType | string): IMetric[] {
    return this.remove((m) => m.type === type || m.name === type);
  }

  /** Remove all metrics. */
  clear(): this {
    this._metrics = [];
    this.syncIndexProperties();
    return this;
  }

  /**
   * Replace all metrics of a given type with new ones.
   */
  replaceByType(type: MetricType | string, ...replacements: IMetric[]): IMetric[] {
    const removed = this.removeByType(type);
    this._metrics.push(...replacements);
    this.syncIndexProperties();
    return removed;
  }

  // ── Merge ──────────────────────────────────────────────────

  /**
   * Merge another container (or raw array) into this one.
   */
  merge(other: MetricContainer | IMetric[] | { metrics: MetricContainer }): this {
    const incoming =
      other instanceof MetricContainer
        ? other._metrics
        : Array.isArray(other)
          ? other
          : other.metrics.toArray();

    const byType = new Map<IMetric['type'], IMetric[]>();
    for (const m of incoming) {
      const group = byType.get(m.type) ?? [];
      group.push(m);
      byType.set(m.type, group);
    }

    for (const [type, incomingGroup] of byType) {
      const existing = this._metrics.filter((m) => m.type === type);

      if (existing.length === 0) {
        this._metrics.push(...incomingGroup);
        continue;
      }

      const existingRank = Math.max(...existing.map((m) => ownershipRank(m)));
      const incomingRank = Math.max(...incomingGroup.map((m) => ownershipRank(m)));

      if (incomingRank > existingRank) {
        this._metrics = this._metrics.filter((m) => m.type !== type);
        this._metrics.push(...incomingGroup);
      } else if (incomingRank === existingRank) {
        this._metrics.push(...incomingGroup);
      }
    }

    this.syncIndexProperties();
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

  /** Flat-map metrics to a new array. */
  flatMap<T>(fn: (m: IMetric, index: number) => T | readonly T[]): T[] {
    return this._metrics.flatMap(fn);
  }

  /** Find the first metric matching a predicate. */
  find(predicate: (m: IMetric) => boolean): IMetric | undefined {
    return this._metrics.find(predicate);
  }

  /** Whether any metric matches the predicate. */
  some(predicate: (m: IMetric) => boolean): boolean {
    return this._metrics.some(predicate);
  }

  /** Whether all metrics match the predicate. */
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

  private syncIndexProperties(): void {
    for (let i = 0; i < this._indexedLength; i++) {
      delete this[i];
    }
    for (let i = 0; i < this._metrics.length; i++) {
      this[i] = this._metrics[i];
    }
    this._indexedLength = this._metrics.length;
  }

  toString(): string {
    return `MetricContainer(${this._metrics.length})[${this._metrics.map((m) => m.type).join(', ')}]`;
  }
}
