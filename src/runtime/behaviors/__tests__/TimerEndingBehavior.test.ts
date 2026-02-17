import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { TimerEndingBehavior } from '../TimerEndingBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { TimeSpan } from '../../models/TimeSpan';

interface MockContextState {
    memoryStore: Map<string, any>;
    listeners: Map<string, (event: any, ctx: IBehaviorContext) => any[]>;
    unsubscribers: Array<ReturnType<typeof vi.fn>>;
}

function createMockContext(timer?: any): { ctx: IBehaviorContext; state: MockContextState } {
    const memoryStore = new Map<string, any>();
    if (timer !== undefined) {
        memoryStore.set('time', timer);
    }

    const listeners = new Map<string, (event: any, ctx: IBehaviorContext) => any[]>();
    const unsubscribers: Array<ReturnType<typeof vi.fn>> = [];

    const ctx = {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: [],
            isComplete: false
        },
        clock: { now: new Date(0) },
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
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value))
    } as unknown as IBehaviorContext;

    return {
        ctx,
        state: { memoryStore, listeners, unsubscribers }
    };
}

describe('TimerEndingBehavior', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('complete-block mode marks complete when elapsed >= duration', () => {
        const { ctx, state } = createMockContext({
            direction: 'down',
            durationMs: 5000,
            spans: [new TimeSpan(0)]
        });

        const behavior = new TimerEndingBehavior({ ending: { mode: 'complete-block' } });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(6000);
        const actions = state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(6000) }, ctx);

        expect(ctx.markComplete).toHaveBeenCalledWith('timer-expired');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('clear-children');
    });

    it('complete-block mode does not mark complete when elapsed < duration', () => {
        const { ctx, state } = createMockContext({
            direction: 'down',
            durationMs: 5000,
            spans: [new TimeSpan(0)]
        });

        const behavior = new TimerEndingBehavior({ ending: { mode: 'complete-block' } });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(4000);
        const actions = state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(4000) }, ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });

    it('complete-block mode emits timer:complete event', () => {
        const { ctx, state } = createMockContext({
            direction: 'down',
            durationMs: 3000,
            spans: [new TimeSpan(0)]
        });

        const behavior = new TimerEndingBehavior({ ending: { mode: 'complete-block' } });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(3000);
        state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(3000) }, ctx);

        expect(ctx.emitEvent).toHaveBeenCalledWith(expect.objectContaining({ name: 'timer:complete' }));
    });

    it('reset-interval mode resets timer spans when elapsed >= duration', () => {
        const { ctx, state } = createMockContext({
            direction: 'down',
            durationMs: 2000,
            spans: [new TimeSpan(0)]
        });

        const behavior = new TimerEndingBehavior({ ending: { mode: 'reset-interval' } });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(2500);
        state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(2500) }, ctx);

        const updatedTimer = state.memoryStore.get('time');
        expect(updatedTimer.spans.length).toBe(1);
        expect(updatedTimer.spans[0].started).toBe(2500);
    });

    it('reset-interval mode does not mark complete', () => {
        const { ctx, state } = createMockContext({
            direction: 'down',
            durationMs: 1000,
            spans: [new TimeSpan(0)]
        });

        const behavior = new TimerEndingBehavior({ ending: { mode: 'reset-interval' } });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(1000);
        state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(1000) }, ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
    });

    it('reset-interval mode handles multiple resets', () => {
        const { ctx, state } = createMockContext({
            direction: 'down',
            durationMs: 1000,
            spans: [new TimeSpan(0)]
        });

        const behavior = new TimerEndingBehavior({ ending: { mode: 'reset-interval' } });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(1000);
        state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(1000) }, ctx);
        expect(state.memoryStore.get('time').spans[0].started).toBe(1000);

        (ctx.clock as any).now = new Date(2100);
        state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(2100) }, ctx);
        expect(state.memoryStore.get('time').spans[0].started).toBe(2100);
    });

    it('handles missing timer memory gracefully', () => {
        const { ctx, state } = createMockContext();
        const behavior = new TimerEndingBehavior({ ending: { mode: 'complete-block' } });

        behavior.onMount(ctx);
        const actions = state.listeners.get('tick')!({ name: 'tick', timestamp: new Date(1000) }, ctx);

        expect(actions).toEqual([]);
        expect(ctx.markComplete).not.toHaveBeenCalled();
    });

    it('unsubscribes on dispose', () => {
        const { ctx, state } = createMockContext({
            direction: 'down',
            durationMs: 1000,
            spans: [new TimeSpan(0)]
        });

        const behavior = new TimerEndingBehavior({ ending: { mode: 'complete-block' } });
        behavior.onMount(ctx);
        behavior.onDispose(ctx);

        expect(state.unsubscribers.length).toBe(1);
        expect(state.unsubscribers[0]).toHaveBeenCalled();
    });
});
