import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { CountdownTimerBehavior } from '../CountdownTimerBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { TimeSpan } from '../../models/TimeSpan';
import { MemoryLocation, MemoryTag } from '../../memory/MemoryLocation';
import { IMetric } from '../../../core/models/Metric';

interface MockContextState {
    memoryStore: Map<string, any>;
    listeners: Map<string, (event: any, ctx: IBehaviorContext) => any[]>;
    unsubscribers: Array<ReturnType<typeof vi.fn>>;
}

function createMockContext(initialTime: number = 0): { ctx: IBehaviorContext; state: MockContextState } {
    const memoryStore = new Map<string, any>();
    const memoryLocations = new Map<string, MemoryLocation>();
    const listeners = new Map<string, (event: any, ctx: IBehaviorContext) => any[]>();
    const unsubscribers: Array<ReturnType<typeof vi.fn>> = [];

    const ctx = {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            metrics: [],
            behaviors: [],
            isComplete: false
        },
        clock: { now: new Date(initialTime) },
        stackLevel: 0,
        subscribe: vi.fn((eventType: string, listener: (event: any, ctx: IBehaviorContext) => any[]) => {
            listeners.set(eventType, listener);
            const unsubscribe = vi.fn();
            unsubscribers.push(unsubscribe);
            return unsubscribe;
        }),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
        getMemoryByTag: vi.fn((tag: MemoryTag) => {
            const loc = memoryLocations.get(tag);
            return loc ? [loc] : [];
        }),
        pushMemory: vi.fn((tag: string, metrics: IMetric[]) => {
            // Store the TimerState (metric.value) so getMemory can return it
            if (metrics.length > 0 && metrics[0].value !== undefined) {
                memoryStore.set(tag, metrics[0].value);
            }
            const loc = new MemoryLocation(tag as MemoryTag, metrics);
            memoryLocations.set(tag, loc);
            return loc;
        }),
        updateMemory: vi.fn((tag: string, metrics: IMetric[]) => {
            const loc = memoryLocations.get(tag);
            if (loc) {
                loc.update(metrics);
                // Also sync memoryStore for backward-compat test assertions
                if (metrics.length > 0 && metrics[0].value !== undefined) {
                    memoryStore.set(tag, metrics[0].value);
                }
            }
        }),
    } as unknown as IBehaviorContext;

    return { ctx, state: { memoryStore, listeners, unsubscribers } };
}

describe('CountdownTimerBehavior (via TimerEndingBehavior replacement)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('complete-block mode marks complete when elapsed >= duration', () => {
        const { ctx, state } = createMockContext(0);

        const behavior = new CountdownTimerBehavior({ durationMs: 5000, mode: 'complete-block' });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(6000);
        const actions = state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(6000) }, ctx);

        expect(ctx.markComplete).toHaveBeenCalledWith('timer-expired');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('clear-children');
    });

    it('complete-block mode does not mark complete when elapsed < duration', () => {
        const { ctx, state } = createMockContext(0);

        const behavior = new CountdownTimerBehavior({ durationMs: 5000, mode: 'complete-block' });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(4000);
        const actions = state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(4000) }, ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });

    it('complete-block mode emits timer:complete event', () => {
        const { ctx, state } = createMockContext(0);

        const behavior = new CountdownTimerBehavior({ durationMs: 3000, mode: 'complete-block' });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(3000);
        state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(3000) }, ctx);

        expect(ctx.emitEvent).toHaveBeenCalledWith(expect.objectContaining({ name: 'timer:complete' }));
    });

    it('reset-interval mode resets timer spans when elapsed >= duration', () => {
        const { ctx, state } = createMockContext(0);

        const behavior = new CountdownTimerBehavior({ durationMs: 2000, mode: 'reset-interval' });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(2500);
        state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(2500) }, ctx);

        const updatedTimer = state.memoryStore.get('time');
        expect(updatedTimer.spans.length).toBe(1);
        expect(updatedTimer.spans[0].started).toBe(2500);
    });

    it('reset-interval mode does not mark complete', () => {
        const { ctx, state } = createMockContext(0);

        const behavior = new CountdownTimerBehavior({ durationMs: 1000, mode: 'reset-interval' });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(1000);
        state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(1000) }, ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
    });

    it('reset-interval mode handles multiple resets', () => {
        const { ctx, state } = createMockContext(0);

        const behavior = new CountdownTimerBehavior({ durationMs: 1000, mode: 'reset-interval' });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(1000);
        state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(1000) }, ctx);
        expect(state.memoryStore.get('time').spans[0].started).toBe(1000);

        (ctx.clock as any).now = new Date(2100);
        state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(2100) }, ctx);
        expect(state.memoryStore.get('time').spans[0].started).toBe(2100);
    });

    it('handles missing timer memory gracefully', () => {
        const { ctx, state } = createMockContext(0);
        // Mount with durationMs=0 triggers immediate expiry - use a special context that has no memory
        const emptyCtx = {
            ...ctx,
            getMemory: vi.fn(() => undefined),
            getMemoryByTag: vi.fn(() => []),
            pushMemory: vi.fn(),
        } as unknown as IBehaviorContext;

        // A timer that should not fire immediately (subscribers are captured via first ctx)
        const behavior = new CountdownTimerBehavior({ durationMs: 5000, mode: 'complete-block' });
        behavior.onMount(emptyCtx);

        // Manually test the tick handler with no memory by getting listener from raw state
        // Since we used emptyCtx, subscribe was on emptyCtx - use emptyCtx.subscribe
        const listener = (emptyCtx.subscribe as ReturnType<typeof vi.fn>).mock.calls.find(
            (call: any[]) => call[0] === 'tick'
        )?.[1];

        if (listener) {
            const emptyGetMemoryCtx = { ...emptyCtx, getMemory: vi.fn(() => undefined), getMemoryByTag: vi.fn(() => []) } as unknown as IBehaviorContext;
            const actions = listener({ name: 'tick', timestamp: new Date(1000) }, emptyGetMemoryCtx);
            expect(actions).toEqual([]);
            expect(emptyCtx.markComplete).not.toHaveBeenCalled();
        }
    });

    it('unsubscribes on dispose', () => {
        const { ctx, state } = createMockContext(0);

        const behavior = new CountdownTimerBehavior({ durationMs: 1000, mode: 'complete-block' });
        behavior.onMount(ctx);
        behavior.onDispose(ctx);

        // Should have 4 unsubscribers (tick + reset + timer:pause + timer:resume)
        expect(state.unsubscribers.length).toBe(4);
        for (const unsub of state.unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
