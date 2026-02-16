import { describe, it, expect, vi } from 'bun:test';
import { RoundsEndBehavior } from '../RoundsEndBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';

function createMockContext(overrides: {
    round?: { current: number; total: number | undefined };
    childrenStatus?: { allCompleted: boolean };
} = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();
    if (overrides.round) {
        memoryStore.set('round', overrides.round);
    }
    if (overrides.childrenStatus) {
        memoryStore.set('children:status', {
            childIndex: 0,
            totalChildren: 1,
            allExecuted: true,
            allCompleted: overrides.childrenStatus.allCompleted
        });
    }

    return {
        block: {
            key: { toString: () => 'round-block' },
            label: 'Rounds',
            fragments: []
        },
        clock: { now: new Date(0) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn()
    } as unknown as IBehaviorContext;
}

describe('RoundsEndBehavior', () => {
    it('completes block when current > total (bounded rounds)', () => {
        const behavior = new RoundsEndBehavior();
        const ctx = createMockContext({ round: { current: 4, total: 3 } });

        const actions = behavior.onNext(ctx);

        expect(ctx.markComplete).toHaveBeenCalledWith('rounds-exhausted');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('pop-block');
    });

    it('does not complete for unbounded rounds', () => {
        const behavior = new RoundsEndBehavior();
        const ctx = createMockContext({ round: { current: 10, total: undefined } });

        const actions = behavior.onNext(ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });

    it('does not complete when current ≤ total', () => {
        const behavior = new RoundsEndBehavior();
        const ctx = createMockContext({ round: { current: 3, total: 3 } });

        const actions = behavior.onNext(ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });

    it('completes session block (total=1) when children status is allCompleted', () => {
        const behavior = new RoundsEndBehavior();
        const ctx = createMockContext({
            round: { current: 1, total: 1 },
            childrenStatus: { allCompleted: true }
        });

        const actions = behavior.onNext(ctx);

        expect(ctx.markComplete).toHaveBeenCalledWith('session-complete');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('pop-block');
    });

    it('does not complete session when children are not done', () => {
        const behavior = new RoundsEndBehavior();
        const ctx = createMockContext({
            round: { current: 1, total: 1 },
            childrenStatus: { allCompleted: false }
        });

        const actions = behavior.onNext(ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });

    it('no-ops when no round state exists', () => {
        const behavior = new RoundsEndBehavior();
        const ctx = createMockContext();

        const actions = behavior.onNext(ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });
});
