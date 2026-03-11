import { describe, it, expect, beforeEach } from 'bun:test';
import { SubscriptionManager } from '../SubscriptionManager';
import { LocalRuntimeSubscription } from '../LocalRuntimeSubscription';
import { IRuntimeSubscription } from '../../contracts/IRuntimeSubscription';
import { StackSnapshot } from '../../contracts/IRuntimeStack';
import { IOutputStatement } from '../../../core/models/OutputStatement';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { TrackerUpdate } from '../../contracts/IRuntimeOptions';

// ── Minimal mock runtime for SubscriptionManager ────────────────────────────

function createMockRuntime(): IScriptRuntime & {
    _stackObservers: Set<(s: StackSnapshot) => void>;
    _outputListeners: Set<(o: IOutputStatement) => void>;
    _trackerListeners: Set<(u: TrackerUpdate) => void>;
    _emitStack: (s: StackSnapshot) => void;
    _emitOutput: (o: IOutputStatement) => void;
    _emitTracker: (u: TrackerUpdate) => void;
} {
    const stackObservers = new Set<(s: StackSnapshot) => void>();
    const outputListeners = new Set<(o: IOutputStatement) => void>();
    const trackerListeners = new Set<(u: TrackerUpdate) => void>();

    return {
        _stackObservers: stackObservers,
        _outputListeners: outputListeners,
        _trackerListeners: trackerListeners,
        _emitStack(snapshot: StackSnapshot) {
            for (const obs of stackObservers) obs(snapshot);
        },
        _emitOutput(output: IOutputStatement) {
            for (const listener of outputListeners) listener(output);
        },
        _emitTracker(update: TrackerUpdate) {
            for (const listener of trackerListeners) listener(update);
        },
        subscribeToStack(observer: (s: StackSnapshot) => void) {
            stackObservers.add(observer);
            return () => stackObservers.delete(observer);
        },
        subscribeToOutput(listener: (o: IOutputStatement) => void) {
            outputListeners.add(listener);
            return () => outputListeners.delete(listener);
        },
        subscribeToTracker(listener: (u: TrackerUpdate) => void) {
            trackerListeners.add(listener);
            return () => trackerListeners.delete(listener);
        },
        tracker: {
            onUpdate: (callback: (u: TrackerUpdate) => void) => {
                trackerListeners.add(callback);
                return () => trackerListeners.delete(callback);
            }
        },
        // Stubs for the rest of IScriptRuntime
        options: {},
        script: { source: '', statements: [], errors: [], getIds: () => [], getId: () => undefined, getAt: () => undefined } as any,
        eventBus: { register: () => () => {}, on: () => () => {}, unregisterById: () => {}, unregisterByOwner: () => {}, dispatch: () => [], emit: () => {}, dispose: () => {} } as any,
        stack: { blocks: [], count: 0, current: undefined, keys: [], push: () => {}, pop: () => undefined, clear: () => {}, subscribe: () => () => {} } as any,
        jit: null as any,
        clock: { now: new Date(), elapsed: 0, isRunning: false, spans: [], start: () => new Date(), stop: () => new Date() } as any,
        errors: [],
        do: () => {},
        doAll: () => {},
        handle: () => {},
        pushBlock: () => {},
        popBlock: () => {},
        getOutputStatements: () => [],
        addOutput: () => {},
        setAnalyticsEngine: () => {},
        dispose: () => {},
    } as any;
}

function createMockSnapshot(type: 'push' | 'pop' | 'clear' | 'initial' = 'push'): StackSnapshot {
    return {
        type,
        blocks: [],
        depth: 0,
        clockTime: new Date(),
    };
}

function createMockOutput(): IOutputStatement {
    return {
        outputType: 'segment',
        sourceBlockKey: 'test-block',
        stackLevel: 0,
        metrics: [],
        metricMeta: new Map(),
        timeSpan: { started: Date.now(), ended: Date.now() + 1000 },
        spans: [],
        elapsed: 1000,
        total: 1000,
    } as any;
}

function createMockTrackerUpdate(): TrackerUpdate {
    return {
        type: 'metric',
        blockId: 'test-block',
        key: 'reps',
        value: 10,
        timestamp: Date.now(),
    };
}

// ── SubscriptionManager tests ───────────────────────────────────────────────

describe('SubscriptionManager', () => {
    let runtime: ReturnType<typeof createMockRuntime>;
    let manager: SubscriptionManager;

    beforeEach(() => {
        runtime = createMockRuntime();
        manager = new SubscriptionManager(runtime);
    });

    it('should start with zero subscriptions', () => {
        expect(manager.count).toBe(0);
    });

    it('should add and track subscriptions', () => {
        const sub = new LocalRuntimeSubscription({ id: 'local' });
        manager.add(sub);
        expect(manager.count).toBe(1);
        expect(manager.has('local')).toBe(true);
    });

    it('should fan out stack snapshots to all subscriptions', () => {
        const received: StackSnapshot[] = [];
        const sub: IRuntimeSubscription = {
            id: 'test',
            onStackSnapshot: (s) => received.push(s),
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => {},
        };
        manager.add(sub);

        const snapshot = createMockSnapshot('push');
        runtime._emitStack(snapshot);

        // Expect 2: one from catch-up during add(), one from fan-out
        expect(received).toHaveLength(2);
        expect(received[0].type).toBe('initial');
        expect(received[1].type).toBe('push');
    });

    it('should fan out output statements to all subscriptions', () => {
        const received: IOutputStatement[] = [];
        const sub: IRuntimeSubscription = {
            id: 'test',
            onStackSnapshot: () => {},
            onOutput: (o) => received.push(o),
            onTrackerUpdate: () => {},
            dispose: () => {},
        };
        manager.add(sub);

        const output = createMockOutput();
        runtime._emitOutput(output);

        // Still 1 because createMockRuntime returns empty getOutputStatements()
        expect(received).toHaveLength(1);
    });

    it('should fan out tracker updates to all subscriptions', () => {
        const received: TrackerUpdate[] = [];
        const sub: IRuntimeSubscription = {
            id: 'test',
            onStackSnapshot: () => {},
            onOutput: () => {},
            onTrackerUpdate: (u) => received.push(u),
            dispose: () => {},
        };
        manager.add(sub);

        const update = createMockTrackerUpdate();
        runtime._emitTracker(update);

        expect(received).toHaveLength(1);
        expect(received[0]).toEqual(update);
    });

    it('should fan out to multiple subscriptions', () => {
        const receivedA: StackSnapshot[] = [];
        const receivedB: StackSnapshot[] = [];

        manager.add({
            id: 'a',
            onStackSnapshot: (s) => receivedA.push(s),
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => {},
        });
        manager.add({
            id: 'b',
            onStackSnapshot: (s) => receivedB.push(s),
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => {},
        });

        runtime._emitStack(createMockSnapshot());

        expect(receivedA).toHaveLength(2);
        expect(receivedB).toHaveLength(2);
    });

    it('should remove subscriptions by id', () => {
        let disposed = false;
        manager.add({
            id: 'removable',
            onStackSnapshot: () => {},
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => { disposed = true; },
        });

        expect(manager.has('removable')).toBe(true);
        const removed = manager.remove('removable');
        expect(removed).toBe(true);
        expect(disposed).toBe(true);
        expect(manager.has('removable')).toBe(false);
        expect(manager.count).toBe(0);
    });

    it('should return false when removing non-existent subscription', () => {
        expect(manager.remove('non-existent')).toBe(false);
    });

    it('should replace existing subscription with same id', () => {
        let disposedFirst = false;
        manager.add({
            id: 'dupe',
            onStackSnapshot: () => {},
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => { disposedFirst = true; },
        });

        const received: StackSnapshot[] = [];
        manager.add({
            id: 'dupe',
            onStackSnapshot: (s) => received.push(s),
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => {},
        });

        expect(disposedFirst).toBe(true);
        expect(manager.count).toBe(1);

        runtime._emitStack(createMockSnapshot());
        expect(received).toHaveLength(2);
    });

    it('should dispose all subscriptions on dispose', () => {
        let disposedA = false;
        let disposedB = false;

        manager.add({
            id: 'a',
            onStackSnapshot: () => {},
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => { disposedA = true; },
        });
        manager.add({
            id: 'b',
            onStackSnapshot: () => {},
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => { disposedB = true; },
        });

        manager.dispose();

        expect(disposedA).toBe(true);
        expect(disposedB).toBe(true);
        expect(manager.count).toBe(0);
    });

    it('should not fan out after dispose', () => {
        const received: StackSnapshot[] = [];
        manager.add({
            id: 'test',
            onStackSnapshot: (s) => received.push(s),
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => {},
        });

        manager.dispose();
        runtime._emitStack(createMockSnapshot());

        // Expect 1: from catch-up during add(), but NO more after dispose
        expect(received).toHaveLength(1);
    });

    it('should handle errors in subscription callbacks gracefully', () => {
        const received: StackSnapshot[] = [];

        manager.add({
            id: 'broken',
            onStackSnapshot: () => { throw new Error('boom'); },
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => {},
        });
        manager.add({
            id: 'healthy',
            onStackSnapshot: (s) => received.push(s),
            onOutput: () => {},
            onTrackerUpdate: () => {},
            dispose: () => {},
        });

        // Should not throw — error is caught internally
        runtime._emitStack(createMockSnapshot());
        expect(received).toHaveLength(2);
    });
});

// ── LocalRuntimeSubscription tests ──────────────────────────────────────────

describe('LocalRuntimeSubscription', () => {
    it('should have default id "local"', () => {
        const sub = new LocalRuntimeSubscription();
        expect(sub.id).toBe('local');
    });

    it('should use custom id', () => {
        const sub = new LocalRuntimeSubscription({ id: 'custom' });
        expect(sub.id).toBe('custom');
    });

    it('should call snapshot callback', () => {
        const received: StackSnapshot[] = [];
        const sub = new LocalRuntimeSubscription({
            onStackSnapshot: (s) => received.push(s),
        });

        sub.onStackSnapshot(createMockSnapshot());
        expect(received).toHaveLength(1);
    });

    it('should call output callback', () => {
        const received: IOutputStatement[] = [];
        const sub = new LocalRuntimeSubscription({
            onOutput: (o) => received.push(o),
        });

        sub.onOutput(createMockOutput());
        expect(received).toHaveLength(1);
    });

    it('should call tracker update callback', () => {
        const received: TrackerUpdate[] = [];
        const sub = new LocalRuntimeSubscription({
            onTrackerUpdate: (u) => received.push(u),
        });

        const update = createMockTrackerUpdate();
        sub.onTrackerUpdate(update);
        expect(received).toHaveLength(1);
        expect(received[0]).toEqual(update);
    });

    it('should not throw without callbacks', () => {
        const sub = new LocalRuntimeSubscription();
        expect(() => sub.onStackSnapshot(createMockSnapshot())).not.toThrow();
        expect(() => sub.onOutput(createMockOutput())).not.toThrow();
        expect(() => sub.onTrackerUpdate(createMockTrackerUpdate())).not.toThrow();
    });

    it('should clear callbacks on dispose', () => {
        const received: StackSnapshot[] = [];
        const sub = new LocalRuntimeSubscription({
            onStackSnapshot: (s) => received.push(s),
        });

        sub.dispose();
        sub.onStackSnapshot(createMockSnapshot());
        expect(received).toHaveLength(0);
    });
});
