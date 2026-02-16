import { describe, it, expect, vi } from 'bun:test';
import { LeafExitBehavior } from '../LeafExitBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';

function createMockContext(): {
    ctx: IBehaviorContext;
    listeners: Map<string, (event: any, ctx: IBehaviorContext) => any[]>;
    unsubscribers: Array<ReturnType<typeof vi.fn>>;
} {
    const listeners = new Map<string, (event: any, ctx: IBehaviorContext) => any[]>();
    const unsubscribers: Array<ReturnType<typeof vi.fn>> = [];

    const ctx = {
        block: {
            key: { toString: () => 'leaf-block' },
            label: 'Leaf',
            fragments: []
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
        getMemory: vi.fn(),
        setMemory: vi.fn()
    } as unknown as IBehaviorContext;

    return { ctx, listeners, unsubscribers };
}

describe('LeafExitBehavior', () => {
    it('marks complete and pops on next by default', () => {
        const { ctx } = createMockContext();
        const behavior = new LeafExitBehavior();

        const actions = behavior.onNext(ctx);

        expect(ctx.markComplete).toHaveBeenCalledWith('user-advance');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('pop-block');
    });

    it('does not pop on next when disabled', () => {
        const { ctx } = createMockContext();
        const behavior = new LeafExitBehavior({ onNext: false });

        const actions = behavior.onNext(ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });

    it('subscribes to configured events', () => {
        const { ctx } = createMockContext();
        const behavior = new LeafExitBehavior({ onEvents: ['timer:complete', 'user:skip'] });

        behavior.onMount(ctx);

        expect(ctx.subscribe).toHaveBeenCalledTimes(2);
        expect(ctx.subscribe).toHaveBeenCalledWith('timer:complete', expect.any(Function));
        expect(ctx.subscribe).toHaveBeenCalledWith('user:skip', expect.any(Function));
    });

    it('marks complete and pops on configured event trigger', () => {
        const { ctx, listeners } = createMockContext();
        const behavior = new LeafExitBehavior({ onEvents: ['timer:complete'] });

        behavior.onMount(ctx);
        const actions = listeners.get('timer:complete')!({ name: 'timer:complete', timestamp: new Date() }, ctx);

        expect(ctx.markComplete).toHaveBeenCalledWith('event:timer:complete');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('pop-block');
    });

    it('handles multiple event types', () => {
        const { ctx, listeners } = createMockContext();
        const behavior = new LeafExitBehavior({ onEvents: ['timer:complete', 'user:skip'] });

        behavior.onMount(ctx);

        const first = listeners.get('timer:complete')!({ name: 'timer:complete', timestamp: new Date() }, ctx);
        const second = listeners.get('user:skip')!({ name: 'user:skip', timestamp: new Date() }, ctx);

        expect(first[0].type).toBe('pop-block');
        expect(second[0].type).toBe('pop-block');
    });

    it('unsubscribes on dispose', () => {
        const { ctx, unsubscribers } = createMockContext();
        const behavior = new LeafExitBehavior({ onEvents: ['timer:complete', 'user:skip'] });

        behavior.onMount(ctx);
        behavior.onDispose(ctx);

        expect(unsubscribers.length).toBe(2);
        expect(unsubscribers[0]).toHaveBeenCalled();
        expect(unsubscribers[1]).toHaveBeenCalled();
    });
});
