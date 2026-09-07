/**
 * Query cache, scan coalescing, and invalidation (wayfinder
 * datadog-analytics ticket 20, per the invalidation and performance
 * contract).
 *
 * - Cache keys are STRUCTURAL: normalized AST, resolved range instants,
 *   effective timezone, captured instant, store generation, and active
 *   unit defaults. Changing any dimension invalidates by key.
 * - Scan coalescing: widgets sharing one resolved range share one in-flight
 *   store fetch — coalescing never merges semantically different queries
 *   beyond the shared raw fetch.
 * - Invalidation: commits to results/notes/efforts/catalog bump an
 *   in-memory generation and post ANALYTICS_MUTATION on BroadcastChannel
 *   'wodwiki.analytics'; a received receipt advances the local epoch so
 *   generation comparisons stay correct across reloads.
 *
 * Pure module: the channel factory is injected (tests pass a fake; the app
 * passes `new BroadcastChannel('wodwiki.analytics')`).
 */

import type { AnyParsedQuery } from './wql';

const MUTATION_MESSAGE = 'ANALYTICS_MUTATION';

/** Cross-tab invalidation bus. Every tab owns one bus over one channel. */
export class AnalyticsInvalidationBus {
    private readonly makeChannel: () => BroadcastChannel | undefined;
    private channel?: BroadcastChannel;
    private generation = 0;
    private readonly listeners = new Set<() => void>();

    constructor(makeChannel: () => BroadcastChannel | undefined) {
        this.makeChannel = makeChannel;
    }

    get generationId(): number {
        return this.generation;
    }

    /** Commit hook: bump local generation and broadcast the receipt. */
    async publishMutation(): Promise<void> {
        this.generation += 1;
        this.notify();
        this.channel ??= this.makeChannel();
        try {
            this.channel?.postMessage({ type: MUTATION_MESSAGE, generation: this.generation });
        } catch {
            // A closed/failed channel must never break the commit path.
        }
    }

    /** Listen for receipts from OTHER tabs (and this one). */
    subscribe(): void {
        this.channel ??= this.makeChannel();
        this.channel?.addEventListener('message', (event: MessageEvent) => {
            const data = event.data as { type?: string; generation?: number } | null;
            if (data?.type !== MUTATION_MESSAGE) return;
            // A receipt is always a NEW mutation for cache purposes: reloads
            // and equal-counter states must not alias (query freshness §6).
            // Advance past the remote epoch unconditionally.
            this.generation = Math.max(this.generation, (data.generation ?? 0)) + 1;
            this.notify();
        });
    }

    onChange(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}

/** Structural cache: entries carry the generation they were computed under;
 *  a read against a different generation is a miss (and drops the entry). */
export class QueryCache {
    private readonly entries = new Map<string, { generation: number; value: unknown }>();

    constructor(bus: AnalyticsInvalidationBus) {
        // Any mutation (local or received from another tab) clears every
        // entry — the generation check is the second guard for entries set
        // in the same tick as a mutation.
        bus.onChange(() => this.entries.clear());
    }

    get(key: string, generation: number): unknown {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        if (entry.generation !== generation) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }

    set(key: string, value: unknown, generation: number): void {
        this.entries.set(key, { generation, value });
    }

    clear(): void {
        this.entries.clear();
    }
}

export interface CacheKeyContext {
    rangeStart?: number;
    rangeEnd?: number;
    timeZone?: string;
    instant?: number;
    generation: number;
    /** Active system default output units (dimension → unit). */
    unitDefaults?: Record<string, string | undefined>;
}

/** Structural cache key: canonical AST + every context dimension. */
export function computeCacheKey(
    parsed: AnyParsedQuery,
    context: CacheKeyContext,
): string {
    // serialize() canonical form normalizes hand-built ASTs; filters and
    // structure participate, raw text does not (whitespace differences are
    // one document).
    const canonical = JSON.stringify([
        parsed.family,
        parsed.family === 'aggregate'
            // `join` participates: different joined populations are different
            // queries even with identical aggregates.
            ? [parsed.agg, parsed.metric, parsed.filters, parsed.groupBy, parsed.rollup ?? null, parsed.window ?? null, parsed.displayUnit ?? null, parsed.join ?? null]
            : null,
        parsed.family === 'find' ? [parsed.target, parsed.filters, parsed.window ?? null, parsed.join ?? null] : null,
        parsed.family === 'rows' ? [parsed.target ?? null, parsed.outputType ?? null, parsed.filters, parsed.window ?? null, parsed.pipes ?? null] : null,
    ]);
    return JSON.stringify([
        canonical,
        context.rangeStart ?? null,
        context.rangeEnd ?? null,
        context.timeZone ?? null,
        context.instant ?? null,
        context.generation,
        context.unitDefaults ? JSON.stringify(Object.entries(context.unitDefaults).sort()) : null,
    ]);
}

interface CoalescingEntry {
    promise: Promise<unknown>;
}

/**
 * Wrap a UnifiedEventStore's range fetch with in-flight coalescing: calls
 * sharing an identical resolved range join one fetch; different ranges scan
 * separately. A mutation through the returned `invalidate()` clears the
 * in-flight map (entries are short-lived by construction).
 */
export function coalescingEventStore<S extends {
    getEventsByTimeRange(start: number, end: number): Promise<unknown>;
}>(inner: S): S & { invalidateInFlight(): void } {
    const inFlight = new Map<string, CoalescingEntry>();

    return {
        ...inner,
        getEventsByTimeRange(start: number, end: number): Promise<unknown> {
            const key = `${start}:${end}`;
            const existing = inFlight.get(key);
            if (existing) return existing.promise;
            const entry: CoalescingEntry = {
                promise: inner.getEventsByTimeRange(start, end).finally(() => {
                    // Identity check: invalidateInFlight may already have
                    // cleared the map and a REPLACEMENT fetch registered —
                    // the stale entry's completion must not delete it.
                    if (inFlight.get(key) === entry) inFlight.delete(key);
                }),
            };
            inFlight.set(key, entry);
            return entry.promise;
        },
        invalidateInFlight(): void {
            inFlight.clear();
        },
    } as S & { invalidateInFlight(): void };
}
