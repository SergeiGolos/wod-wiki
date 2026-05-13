/**
 * Unit tests for OutputEmitter
 *
 * Targets: src/runtime/OutputEmitter.ts (17 missing lines per Codecov WOD-271)
 *
 * Coverage goals:
 *  - hasListeners() branch
 *  - finalizeAnalytics() with listener error handling
 *  - dispose() cleanup
 *  - emitLoad() with nested parents
 *  - emitStackEvent() GC guard + push-with-parent + pop-completion-reason
 *  - emitSegmentFromResultMemory() multiple result groups + empty metrics skip
 *  - emitRuntimeEvent() with/without current block
 *  - emitCompilerBlock() basic call
 *  - _extractSpans() edge cases (spans field, missing started, no NaN)
 */
import { describe, it, expect, vi } from 'bun:test';
import { OutputEmitter } from '../OutputEmitter';
import { OutputStatement } from '../../core/models/OutputStatement';
import { MetricContainer } from '../../core/models/MetricContainer';
import { MetricType } from '../../core/models/Metric';
import { TimeSpan } from '../models/TimeSpan';
import { BlockKey } from '../../core/models/BlockKey';
import type { IOutputStatement } from '../../core/models/OutputStatement';
import type { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import type { IRuntimeClock } from '../contracts/IRuntimeClock';
import type { IRuntimeStack } from '../contracts/IRuntimeStack';
import type { IAnalyticsEngine } from '../../core/contracts/IAnalyticsEngine';
import type { WhiteboardScript } from '../../parser/WhiteboardScript';

// ── Minimal helpers ──────────────────────────────────────────────────────────

function makeClock(now = new Date('2024-01-01T12:00:00Z')): IRuntimeClock {
    return { now, elapsed: 0, isRunning: false, spans: [], start: () => now, stop: () => now };
}

function makeOutput(type: IOutputStatement['outputType'] = 'segment'): IOutputStatement {
    return new OutputStatement({
        outputType: type,
        timeSpan: new TimeSpan(0, 1000),
        sourceBlockKey: 'test',
        stackLevel: 0,
        metrics: MetricContainer.empty('test'),
    });
}

function makeBlock(key = 'block-1', opts: {
    label?: string;
    blockType?: string;
    resultLocs?: Array<{ metrics: any }>;
    displayLocs?: Array<{ metrics: any }>;
    behaviors?: any[];
    completionReason?: string;
    executionTiming?: { startTime?: Date };
    sourceIds?: number[];
} = {}): IRuntimeBlock {
    const bk = new BlockKey(key);
    return {
        key: bk,
        label: opts.label ?? 'Test',
        blockType: opts.blockType ?? 'Timer',
        behaviors: opts.behaviors ?? [],
        sourceIds: opts.sourceIds ?? [1],
        isComplete: false,
        executionTiming: opts.executionTiming ?? { startTime: new Date('2024-01-01T12:00:00Z') },
        completionReason: opts.completionReason,
        getMemoryByTag: vi.fn().mockImplementation((tag: string) => {
            if (tag === 'metric:result') return opts.resultLocs ?? [];
            if (tag === 'metric:display') return opts.displayLocs ?? [];
            return [];
        }),
        mount: vi.fn().mockReturnValue([]),
        next: vi.fn().mockReturnValue([]),
        unmount: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
        pushMemory: vi.fn(),
        getAllMemory: vi.fn().mockReturnValue([]),
    } as unknown as IRuntimeBlock;
}

function makeStack(current?: IRuntimeBlock, count = 0): IRuntimeStack {
    return {
        current,
        count,
        blocks: current ? [current] : [],
        push: vi.fn(),
        pop: vi.fn(),
        clear: vi.fn(),
        subscribe: vi.fn().mockReturnValue(() => {}),
        keys: [],
    } as unknown as IRuntimeStack;
}

function makeScript(statements: any[] = []): WhiteboardScript {
    return {
        source: '5:00 Run\n3:00 Walk',
        statements,
        getId: (id: number) => statements.find(s => s.id === id),
    } as unknown as WhiteboardScript;
}

// ── Core API tests ───────────────────────────────────────────────────────────

describe('OutputEmitter — core API', () => {
    it('add() buffers output and notifies listeners', () => {
        const emitter = new OutputEmitter();
        const received: IOutputStatement[] = [];
        emitter.subscribe(o => received.push(o));

        const out = makeOutput();
        emitter.add(out);

        expect(emitter.getAll()).toHaveLength(1);
        expect(received).toHaveLength(1);
        expect(received[0]).toBe(out);
    });

    it('add() skips system outputs when no listeners present (GC guard)', () => {
        const emitter = new OutputEmitter();
        const sysOut = makeOutput('system');

        emitter.add(sysOut);

        // Should NOT be buffered — no listener, system type
        expect(emitter.getAll()).toHaveLength(0);
    });

    it('add() keeps system outputs when a listener is present', () => {
        const emitter = new OutputEmitter();
        emitter.subscribe(() => {}); // add a listener
        const sysOut = makeOutput('system');

        emitter.add(sysOut);

        expect(emitter.getAll()).toHaveLength(1);
    });

    it('add() runs analytics enrichment when engine is set', () => {
        const emitter = new OutputEmitter();
        const enriched = makeOutput('segment');
        const engine: IAnalyticsEngine = {
            run: vi.fn().mockReturnValue(enriched),
            finalize: vi.fn().mockReturnValue([]),
        };
        emitter.setAnalyticsEngine(engine);

        const original = makeOutput('segment');
        emitter.add(original);

        expect(engine.run).toHaveBeenCalledWith(original);
        expect(emitter.getAll()[0]).toBe(enriched);
    });

    it('add() isolates listener errors — other listeners still receive output', () => {
        const emitter = new OutputEmitter();
        const goodReceived: IOutputStatement[] = [];
        emitter.subscribe(() => { throw new Error('bad listener'); });
        emitter.subscribe(o => goodReceived.push(o));

        const out = makeOutput();
        // Should not throw
        expect(() => emitter.add(out)).not.toThrow();
        expect(goodReceived).toHaveLength(1);
    });

    it('getAll() returns a defensive copy', () => {
        const emitter = new OutputEmitter();
        emitter.add(makeOutput());

        const copy1 = emitter.getAll();
        const copy2 = emitter.getAll();
        expect(copy1).not.toBe(copy2);
        expect(copy1).toHaveLength(1);
    });

    it('hasListeners() returns false before subscribe and true after', () => {
        const emitter = new OutputEmitter();

        expect(emitter.hasListeners()).toBe(false);

        const unsub = emitter.subscribe(() => {});
        expect(emitter.hasListeners()).toBe(true);

        unsub();
        expect(emitter.hasListeners()).toBe(false);
    });

    it('subscribe() delivers deferred catch-up to new listener', async () => {
        const emitter = new OutputEmitter();
        emitter.subscribe(() => {}); // ensure system outputs are allowed
        const out = makeOutput('segment');
        emitter.add(out);

        const catchUp: IOutputStatement[] = [];
        emitter.subscribe(o => catchUp.push(o));

        // catch-up fires asynchronously (setTimeout 0)
        await new Promise(r => setTimeout(r, 20));
        expect(catchUp).toHaveLength(1);
        expect(catchUp[0]).toBe(out);
    });

    it('subscribe() does not deliver catch-up after unsubscribe', async () => {
        const emitter = new OutputEmitter();
        emitter.subscribe(() => {}); // listener to allow system guard bypass
        emitter.add(makeOutput('segment'));

        const received: IOutputStatement[] = [];
        const unsub = emitter.subscribe(o => received.push(o));
        unsub(); // immediately unsubscribe before deferred fires

        await new Promise(r => setTimeout(r, 20));
        expect(received).toHaveLength(0);
    });
});

// ── finalizeAnalytics ────────────────────────────────────────────────────────

describe('OutputEmitter — finalizeAnalytics', () => {
    it('returns empty array when no analytics engine is set', () => {
        const emitter = new OutputEmitter();
        expect(emitter.finalizeAnalytics()).toEqual([]);
    });

    it('flushes summary outputs and notifies listeners', () => {
        const emitter = new OutputEmitter();
        const summary = makeOutput('segment');
        const engine: IAnalyticsEngine = {
            run: vi.fn().mockImplementation(o => o),
            finalize: vi.fn().mockReturnValue([summary]),
        };
        emitter.setAnalyticsEngine(engine);

        const received: IOutputStatement[] = [];
        emitter.subscribe(o => received.push(o));

        const results = emitter.finalizeAnalytics();

        expect(results).toHaveLength(1);
        expect(results[0]).toBe(summary);
        expect(emitter.getAll()).toHaveLength(1);
        expect(received).toHaveLength(1);
    });

    it('isolates listener errors during finalize', () => {
        const emitter = new OutputEmitter();
        const engine: IAnalyticsEngine = {
            run: vi.fn().mockImplementation(o => o),
            finalize: vi.fn().mockReturnValue([makeOutput('segment')]),
        };
        emitter.setAnalyticsEngine(engine);
        emitter.subscribe(() => { throw new Error('finalize listener error'); });

        expect(() => emitter.finalizeAnalytics()).not.toThrow();
    });
});

// ── dispose ──────────────────────────────────────────────────────────────────

describe('OutputEmitter — dispose', () => {
    it('clears buffer and listeners', () => {
        const emitter = new OutputEmitter();
        emitter.subscribe(() => {});
        emitter.add(makeOutput('segment'));

        expect(emitter.getAll()).toHaveLength(1);
        expect(emitter.hasListeners()).toBe(true);

        emitter.dispose();

        expect(emitter.getAll()).toHaveLength(0);
        expect(emitter.hasListeners()).toBe(false);
    });
});

// ── emitStackEvent ───────────────────────────────────────────────────────────

describe('OutputEmitter — emitStackEvent', () => {
    it('skips output creation when no listeners are present (GC guard)', () => {
        const emitter = new OutputEmitter();
        const block = makeBlock('b1');
        const clock = makeClock();

        // No listeners — should NOT emit (hasListeners guard)
        emitter.emitStackEvent({ type: 'push', block, depth: 1 }, [block], clock);

        expect(emitter.getAll()).toHaveLength(0);
    });

    it('emits system output for push event', () => {
        const emitter = new OutputEmitter();
        emitter.subscribe(() => {}); // register a listener
        const block = makeBlock('b1');
        const clock = makeClock();

        emitter.emitStackEvent({ type: 'push', block, depth: 1 }, [block], clock);

        const all = emitter.getAll();
        expect(all).toHaveLength(1);
        expect(all[0].outputType).toBe('system');
    });

    it('includes parent block key when pushing with a parent', () => {
        const emitter = new OutputEmitter();
        const received: IOutputStatement[] = [];
        emitter.subscribe(o => received.push(o));

        const parent = makeBlock('parent');
        const child = makeBlock('child');
        const clock = makeClock();

        // stackBlocks[0] is top (child), stackBlocks[1] is parent
        emitter.emitStackEvent({ type: 'push', block: child, depth: 2 }, [child, parent], clock);

        expect(received).toHaveLength(1);
        const metric = received[0].metrics.toArray()[0];
        expect((metric.value as any).parentKey).toBe('parent');
    });

    it('includes completionReason for pop events', () => {
        const emitter = new OutputEmitter();
        const received: IOutputStatement[] = [];
        emitter.subscribe(o => received.push(o));

        const block = makeBlock('b1', { completionReason: 'timeout' });
        const clock = makeClock();

        emitter.emitStackEvent({ type: 'pop', block, depth: 1 }, [block], clock);

        const metric = received[0].metrics.toArray()[0];
        expect((metric.value as any).completionReason).toBe('timeout');
    });

    it('uses "normal" as default completionReason when not set on block', () => {
        const emitter = new OutputEmitter();
        const received: IOutputStatement[] = [];
        emitter.subscribe(o => received.push(o));

        const block = makeBlock('b1'); // no completionReason
        const clock = makeClock();

        emitter.emitStackEvent({ type: 'pop', block, depth: 1 }, [block], clock);

        const metric = received[0].metrics.toArray()[0];
        expect((metric.value as any).completionReason).toBe('normal');
    });
});

// ── emitSegmentFromResultMemory ──────────────────────────────────────────────

describe('OutputEmitter — emitSegmentFromResultMemory', () => {
    it('emits nothing when block has no metric:result memory', () => {
        const emitter = new OutputEmitter();
        const block = makeBlock('b1'); // no resultLocs
        emitter.emitSegmentFromResultMemory(block, 1, makeClock());

        expect(emitter.getAll()).toHaveLength(0);
    });

    it('emits one segment output per result memory location', () => {
        const emitter = new OutputEmitter();
        const metric1 = { type: MetricType.System, image: 'R1', value: 1, origin: 'runtime' as any, timestamp: new Date() };
        const metric2 = { type: MetricType.System, image: 'R2', value: 2, origin: 'runtime' as any, timestamp: new Date() };

        const block = makeBlock('b1', {
            resultLocs: [
                { metrics: MetricContainer.empty('b1').add(metric1) },
                { metrics: MetricContainer.empty('b1').add(metric2) },
            ],
        });

        emitter.emitSegmentFromResultMemory(block, 1, makeClock());

        // 2 result groups → 2 segment outputs
        expect(emitter.getAll()).toHaveLength(2);
        expect(emitter.getAll().every(o => o.outputType === 'segment')).toBe(true);
    });

    it('skips result group when merged metrics are empty', () => {
        const emitter = new OutputEmitter();
        // Empty MetricContainer — metrics.length === 0 after merge
        const block = makeBlock('b1', {
            resultLocs: [{ metrics: MetricContainer.empty('b1') }],
        });

        emitter.emitSegmentFromResultMemory(block, 1, makeClock());

        // Empty result → skipped
        expect(emitter.getAll()).toHaveLength(0);
    });

    it('overrides source display metrics with result metrics of same type', () => {
        const emitter = new OutputEmitter();
        const resultMetric = {
            type: MetricType.Label,
            image: 'Result',
            value: 'result',
            origin: 'runtime' as any,
            timestamp: new Date(),
        };
        const displayMetric = {
            type: MetricType.Label, // same type — should be overridden
            image: 'Display',
            value: 'display',
            origin: 'runtime' as any,
            timestamp: new Date(),
        };

        const block = makeBlock('b1', {
            resultLocs: [{ metrics: MetricContainer.empty('b1').add(resultMetric) }],
            displayLocs: [{ metrics: MetricContainer.empty('b1').add(displayMetric) }],
        });

        emitter.emitSegmentFromResultMemory(block, 1, makeClock());

        const segments = emitter.getAll();
        expect(segments).toHaveLength(1);
        // Only result metric should survive (display has same type — filtered out)
        const types = segments[0].metrics.toArray().map(m => m.type);
        expect(types.filter(t => t === MetricType.Label)).toHaveLength(1);
        expect(segments[0].metrics.toArray().find(m => m.image === 'Result')).toBeDefined();
        expect(segments[0].metrics.toArray().find(m => m.image === 'Display')).toBeUndefined();
    });
});

// ── emitRuntimeEvent ─────────────────────────────────────────────────────────

describe('OutputEmitter — emitRuntimeEvent', () => {
    it('emits event output with current block key', () => {
        const emitter = new OutputEmitter();
        const block = makeBlock('active-block');
        const stack = makeStack(block, 1);
        const clock = makeClock();

        emitter.emitRuntimeEvent({ name: 'next', timestamp: new Date(), data: {} }, stack, clock);

        const all = emitter.getAll();
        expect(all).toHaveLength(1);
        expect(all[0].outputType).toBe('event');
        expect(all[0].sourceBlockKey).toBe('active-block');
    });

    it('falls back to "root" when stack has no current block', () => {
        const emitter = new OutputEmitter();
        const stack = makeStack(undefined, 0); // no current block
        const clock = makeClock();

        emitter.emitRuntimeEvent({ name: 'tick', timestamp: new Date(), data: {} }, stack, clock);

        expect(emitter.getAll()[0].sourceBlockKey).toBe('root');
    });
});

// ── emitCompilerBlock ────────────────────────────────────────────────────────

describe('OutputEmitter — emitCompilerBlock', () => {
    it('emits compiler output with behavior names', () => {
        const emitter = new OutputEmitter();
        const block = makeBlock('b1', {
            behaviors: [
                { constructor: { name: 'CountdownTimerBehavior' } },
                { constructor: { name: 'LabelingBehavior' } },
            ] as any,
        });
        const clock = makeClock();

        emitter.emitCompilerBlock(block, 0, clock);

        const all = emitter.getAll();
        expect(all).toHaveLength(1);
        expect(all[0].outputType).toBe('compiler');
        const metric = all[0].metrics.toArray()[0];
        expect(metric.image).toContain('CountdownTimerBehavior');
        expect(metric.image).toContain('LabelingBehavior');
    });
});

// ── emitLoad ─────────────────────────────────────────────────────────────────

describe('OutputEmitter — emitLoad', () => {
    it('emits one load output per script statement', () => {
        const emitter = new OutputEmitter();
        const script = makeScript([
            {
                id: 1,
                parent: undefined,
                meta: { startOffset: 0, endOffset: 7 },
                metrics: MetricContainer.empty('1'),
                children: [],
                metricMeta: new Map(),
            },
            {
                id: 2,
                parent: undefined,
                meta: { startOffset: 9, endOffset: 17 },
                metrics: MetricContainer.empty('2'),
                children: [],
                metricMeta: new Map(),
            },
        ]);

        emitter.emitLoad(script, makeClock());

        expect(emitter.getAll()).toHaveLength(2);
        expect(emitter.getAll().every(o => o.outputType === 'load')).toBe(true);
    });

    it('computes correct logical depth for nested statements', () => {
        const emitter = new OutputEmitter();
        const script = makeScript([
            {
                id: 1,
                parent: undefined,
                meta: { startOffset: 0, endOffset: 5 },
                metrics: MetricContainer.empty('1'),
                children: [],
                metricMeta: new Map(),
            },
            {
                id: 2,
                parent: 1,
                meta: { startOffset: 7, endOffset: 12 },
                metrics: MetricContainer.empty('2'),
                children: [],
                metricMeta: new Map(),
            },
        ]);

        emitter.emitLoad(script, makeClock());

        const all = emitter.getAll();
        expect(all[0].stackLevel).toBe(0); // root statement, depth 0
        expect(all[1].stackLevel).toBe(1); // child statement, depth 1
    });
});
