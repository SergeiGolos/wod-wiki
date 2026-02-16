import { describe, it, expect, vi } from 'bun:test';
import { RoundOutputBehavior } from '../RoundOutputBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { FragmentType } from '../../../core/models/CodeFragment';
import { RoundState, TimerState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';

function createMockContext(entries: Record<string, unknown> = {}): IBehaviorContext {
    const memoryStore = new Map<string, unknown>(Object.entries(entries));

    return {
        block: {
            key: { toString: () => 'loop-block' },
            label: 'Loop',
            fragments: [],
            completionReason: undefined,
            getMemoryByTag: () => [],
            getBehavior: () => undefined,
        },
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: unknown) => memoryStore.set(type, value)),
    } as unknown as IBehaviorContext;
}

describe('RoundOutputBehavior', () => {
    it('emits milestone on mount for multi-round state', () => {
        const behavior = new RoundOutputBehavior();
        const ctx = createMockContext({ round: { current: 1, total: 3 } as RoundState });

        behavior.onMount(ctx);

        expect(ctx.emitOutput).toHaveBeenCalledWith(
            'milestone',
            [expect.objectContaining({
                fragmentType: FragmentType.CurrentRound,
                value: { current: 1, total: 3 },
                image: 'Round 1 of 3',
            })],
            expect.objectContaining({ label: 'Round 1 of 3' })
        );
    });

    it('does not emit milestone on mount for single-round state', () => {
        const behavior = new RoundOutputBehavior();
        const ctx = createMockContext({ round: { current: 1, total: 1 } as RoundState });

        behavior.onMount(ctx);

        expect(ctx.emitOutput).not.toHaveBeenCalled();
    });

    it('does not emit milestone on next when children are not completed', () => {
        const behavior = new RoundOutputBehavior();
        const ctx = createMockContext({
            round: { current: 2, total: 5 } as RoundState,
            'children:status': {
                childIndex: 1,
                totalChildren: 3,
                allExecuted: false,
                allCompleted: false,
            },
        });

        behavior.onNext(ctx);

        expect(ctx.emitOutput).not.toHaveBeenCalled();
    });

    it('emits milestone on next when children are completed', () => {
        const behavior = new RoundOutputBehavior();
        const ctx = createMockContext({
            round: { current: 2, total: 5 } as RoundState,
            'children:status': {
                childIndex: 3,
                totalChildren: 3,
                allExecuted: true,
                allCompleted: true,
            },
        });

        behavior.onNext(ctx);

        expect(ctx.emitOutput).toHaveBeenCalledWith(
            'milestone',
            [expect.objectContaining({ value: { current: 2, total: 5 } })],
            expect.objectContaining({ label: 'Round 2 of 5' })
        );
    });

    it('includes timer fragments in milestones when timer memory exists', () => {
        const behavior = new RoundOutputBehavior();
        const timer: TimerState = {
            spans: [new TimeSpan(0)],
            direction: 'down',
            durationMs: 60000,
            label: 'Interval',
            role: 'primary',
        };

        const ctx = createMockContext({
            round: { current: 2, total: 4 } as RoundState,
            timer,
            'children:status': {
                childIndex: 1,
                totalChildren: 1,
                allExecuted: true,
                allCompleted: true,
            },
        });

        behavior.onNext(ctx);

        expect(ctx.emitOutput).toHaveBeenCalledWith(
            'milestone',
            expect.arrayContaining([
                expect.objectContaining({ fragmentType: FragmentType.CurrentRound }),
                expect.objectContaining({ fragmentType: FragmentType.Elapsed }),
            ]),
            expect.objectContaining({ label: 'Round 2 of 4' })
        );
    });
});
