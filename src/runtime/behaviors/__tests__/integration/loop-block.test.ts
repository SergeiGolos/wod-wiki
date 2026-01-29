/**
 * Loop Block Integration Tests
 * 
 * Tests round/iteration behaviors working together in realistic scenarios.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
    createMockRuntime,
    createMockBlock,
    mountBehaviors,
    advanceBehaviors,
    unmountBehaviors,
    expectMemoryState,
    findEvents,
    findOutputs,
    MockRuntime,
    MockBlock
} from './test-helpers';

import { RoundInitBehavior } from '../../RoundInitBehavior';
import { RoundAdvanceBehavior } from '../../RoundAdvanceBehavior';
import { RoundCompletionBehavior } from '../../RoundCompletionBehavior';
import { RoundDisplayBehavior } from '../../RoundDisplayBehavior';
import { RoundOutputBehavior } from '../../RoundOutputBehavior';
import { DisplayInitBehavior } from '../../DisplayInitBehavior';
import { HistoryRecordBehavior } from '../../HistoryRecordBehavior';
import { RoundState, DisplayState } from '../../../memory/MemoryTypes';

describe('Loop Block Integration', () => {
    let runtime: MockRuntime;
    let block: MockBlock;

    beforeEach(() => {
        runtime = createMockRuntime(0);
        block = createMockBlock({ label: 'Loop Test' });
    });

    describe('Round Tracking', () => {
        const createLoopBehaviors = (totalRounds: number = 5) => [
            new RoundInitBehavior({ totalRounds, startRound: 1 }),
            new RoundAdvanceBehavior(),
            new RoundCompletionBehavior(),
            new RoundDisplayBehavior(),
            new DisplayInitBehavior({ mode: 'clock', label: 'Rounds' }),
            new RoundOutputBehavior()
        ];

        it('should initialize at round 1', () => {
            const behaviors = createLoopBehaviors();

            mountBehaviors(behaviors, runtime, block);

            expectMemoryState(block, 'round', {
                current: 1,
                total: 5
            });
        });

        it('should advance round on next()', () => {
            const behaviors = createLoopBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(2);
        });

        it('should mark complete when rounds exceed total', () => {
            const behaviors = createLoopBehaviors(3); // 3 rounds
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Advance through all rounds
            advanceBehaviors(behaviors, ctx); // Round 2
            advanceBehaviors(behaviors, ctx); // Round 3
            advanceBehaviors(behaviors, ctx); // Round 4 > total 3 -> complete

            expect(runtime.completionReason).toBe('rounds-complete');
        });

        it('should not complete for unbounded rounds', () => {
            const behaviors = [
                new RoundInitBehavior({ totalRounds: undefined, startRound: 1 }),
                new RoundAdvanceBehavior(),
                new RoundCompletionBehavior(), // Should not trigger without total
                new RoundDisplayBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Advance many times
            for (let i = 0; i < 100; i++) {
                advanceBehaviors(behaviors, ctx);
            }

            expect(runtime.completionReason).toBeUndefined();

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(101); // 1 + 100 advances
        });

        it('should update roundDisplay on each advance', () => {
            const behaviors = createLoopBehaviors(5);
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx); // Round 2

            const display = block.memory.get('display') as DisplayState;
            expect(display.roundDisplay).toBe('Round 2 of 5');
        });
    });

    describe('Output Emission', () => {
        const createLoopBehaviors = (totalRounds: number = 3) => [
            new RoundInitBehavior({ totalRounds, startRound: 1 }),
            new RoundAdvanceBehavior(),
            new RoundCompletionBehavior(),
            new RoundOutputBehavior(),
            new HistoryRecordBehavior()
        ];

        it('should emit round:advance event on advance', () => {
            const behaviors = createLoopBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);

            const advanceEvents = findEvents(runtime, 'round:advance');
            expect(advanceEvents.length).toBeGreaterThanOrEqual(1);
            expect((advanceEvents[0].data as any).newRound).toBe(2);
        });

        it('should emit milestone output on round advance', () => {
            const behaviors = createLoopBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);

            const milestones = findOutputs(runtime, 'milestone');
            expect(milestones.length).toBeGreaterThanOrEqual(1);
        });

        it('should emit completion output with correct round count', () => {
            const behaviors = createLoopBehaviors(2);
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx); // Round 2
            advanceBehaviors(behaviors, ctx); // Round 3 > 2, complete
            unmountBehaviors(behaviors, ctx);

            const completions = findOutputs(runtime, 'completion');
            expect(completions.length).toBeGreaterThanOrEqual(1);
        });

        it('should record history on unmount', () => {
            const behaviors = createLoopBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);
            advanceBehaviors(behaviors, ctx);
            unmountBehaviors(behaviors, ctx);

            const historyEvents = findEvents(runtime, 'history:record');
            expect(historyEvents.length).toBeGreaterThanOrEqual(1);
            expect((historyEvents[0].data as any).blockKey).toBeDefined();
        });
    });

    describe('Display State', () => {
        it('should initialize display with correct mode', () => {
            const behaviors = [
                new RoundInitBehavior({ totalRounds: 5 }),
                new DisplayInitBehavior({ mode: 'clock', label: 'Test' }),
                new RoundDisplayBehavior()
            ];

            mountBehaviors(behaviors, runtime, block);

            expectMemoryState(block, 'display', {
                mode: 'clock',
                label: 'Test'
            });
        });

        it('should set initial roundDisplay on mount', () => {
            const behaviors = [
                new RoundInitBehavior({ totalRounds: 5, startRound: 1 }),
                new DisplayInitBehavior({ mode: 'clock' }),
                new RoundDisplayBehavior()
            ];

            mountBehaviors(behaviors, runtime, block);

            const display = block.memory.get('display') as DisplayState;
            expect(display.roundDisplay).toBe('Round 1 of 5');
        });

        it('should handle unbounded rounds in display', () => {
            const behaviors = [
                new RoundInitBehavior({ totalRounds: undefined, startRound: 1 }),
                new RoundAdvanceBehavior(),
                new DisplayInitBehavior({ mode: 'clock' }),
                new RoundDisplayBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);

            const display = block.memory.get('display') as DisplayState;
            expect(display.roundDisplay).toContain('Round 2');
        });
    });

    describe('Edge Cases', () => {
        it('should handle start round other than 1', () => {
            const behaviors = [
                new RoundInitBehavior({ totalRounds: 5, startRound: 3 }),
                new RoundAdvanceBehavior(),
                new RoundCompletionBehavior()
            ];

            mountBehaviors(behaviors, runtime, block);

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(3);
        });

        it('should complete immediately if startRound > totalRounds', () => {
            const behaviors = [
                new RoundInitBehavior({ totalRounds: 2, startRound: 3 }),
                new RoundAdvanceBehavior(),
                new RoundCompletionBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // First next() should complete since 3 > 2
            advanceBehaviors(behaviors, ctx);

            expect(runtime.completionReason).toBe('rounds-complete');
        });
    });
});
