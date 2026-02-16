import { describe, it, expect, vi } from 'bun:test';
import { RoundsEndBehavior } from '../RoundsEndBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';

function createMockContext(overrides: {
    round?: { current: number; total: number | undefined };
    isComplete?: boolean;
} = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();
    if (overrides.round) {
        memoryStore.set('round', overrides.round);
    }

    return {
        block: {
            key: { toString: () => 'round-block' },
            label: 'Rounds',
            fragments: [],
            isComplete: overrides.isComplete ?? false,
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
    it('skips when block is already marked complete', () => {
        const behavior = new RoundsEndBehavior();
        const ctx = createMockContext({
            round: { current: 4, total: 3 },
            isComplete: true,
        });

        const actions = behavior.onNext(ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });

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

    it('does not complete when current equals total (safety net for ChildSelection)', () => {
        // ChildSelectionBehavior handles completion when shouldLoop returns false.
        // RoundsEndBehavior only fires as a safety net when current exceeds total.
        const behavior = new RoundsEndBehavior();
        const ctx = createMockContext({
            round: { current: 3, total: 3 },
        });

        const actions = behavior.onNext(ctx);

        expect(ctx.markComplete).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });

    it('does not complete single-round block when current equals total', () => {
        const behavior = new RoundsEndBehavior();
        const ctx = createMockContext({
            round: { current: 1, total: 1 },
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
