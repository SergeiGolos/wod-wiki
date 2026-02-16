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
    expectDisplayLabel,
    expectRoundDisplay,
    getRoundDisplay,
    findEvents,
    findOutputs,
    MockRuntime,
    MockBlock
} from './test-helpers';

import { ReEntryBehavior } from '../../ReEntryBehavior';
import { RoundsEndBehavior } from '../../RoundsEndBehavior';
import { ReportOutputBehavior } from '../../ReportOutputBehavior';
import { LabelingBehavior } from '../../LabelingBehavior';
import { HistoryRecordBehavior } from '../../HistoryRecordBehavior';
import { RoundState } from '../../../memory/MemoryTypes';

describe('Loop Block Integration', () => {
    let runtime: MockRuntime;
    let block: MockBlock;

    beforeEach(() => {
        runtime = createMockRuntime(0);
        block = createMockBlock({ label: 'Loop Test' });
    });

    describe('Round Tracking', () => {
        const createLoopBehaviors = (totalRounds: number = 5) => [
            new ReEntryBehavior({ totalRounds, startRound: 1 }),
            new RoundsEndBehavior(),
            new LabelingBehavior({ mode: 'clock', label: 'Rounds' }),
            new ReportOutputBehavior()
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

            expect(runtime.completionReason).toBe('rounds-exhausted');
        });

        it('should not complete for unbounded rounds', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: undefined, startRound: 1 }),
                new RoundsEndBehavior(), // Should not trigger without total
                new LabelingBehavior()
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

            expectRoundDisplay(block, 'Round 2 of 5');
        });
    });

    describe('Output Emission', () => {
        const createLoopBehaviors = (totalRounds: number = 3) => [
            new ReEntryBehavior({ totalRounds, startRound: 1 }),
            new RoundsEndBehavior(),
            new ReportOutputBehavior(),
            new HistoryRecordBehavior()
        ];

        it('should update round memory on advance (no event emission)', () => {
            const behaviors = createLoopBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);

            // Round advancement is signaled by memory update, not event
            const round = block.memory.get('round') as { current: number; total: number };
            expect(round.current).toBe(2);
        });

        it('should emit milestone output on round advance', () => {
            const behaviors = createLoopBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);

            const milestones = findOutputs(runtime, 'milestone');
            expect(milestones.length).toBeGreaterThanOrEqual(1);
        });

        it('should emit completion output with spans on unmount', () => {
            const behaviors = createLoopBehaviors(2);
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx); // Round 2
            advanceBehaviors(behaviors, ctx); // Round 3 > 2, complete
            unmountBehaviors(behaviors, ctx);

            // Completion output now emitted with elapsed/total/spans fragments
            const completions = findOutputs(runtime, 'completion');
            expect(completions.length).toBe(1);

            const completion = completions[0];
            const hasSpans = (completion.fragments as any[]).some(f => f.fragmentType === 'spans');
            expect(hasSpans).toBe(true);
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
        it('should initialize display with correct label', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: 5 }),
                new LabelingBehavior({ mode: 'clock', label: 'Test' })
            ];

            mountBehaviors(behaviors, runtime, block);

            expectDisplayLabel(block, 'Test');
        });

        it('should set initial roundDisplay on mount', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: 5, startRound: 1 }),
                new LabelingBehavior({ mode: 'clock' })
            ];

            mountBehaviors(behaviors, runtime, block);

            expectRoundDisplay(block, 'Round 1 of 5');
        });

        it('should handle unbounded rounds in display', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: undefined, startRound: 1 }),
                new LabelingBehavior({ mode: 'clock' })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);

            const roundDisplay = getRoundDisplay(block);
            expect(roundDisplay).toContain('Round 2');
        });
    });

    describe('Edge Cases', () => {
        it('should handle start round other than 1', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: 5, startRound: 3 }),
                new RoundsEndBehavior()
            ];

            mountBehaviors(behaviors, runtime, block);

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(3);
        });

        it('should complete immediately if startRound > totalRounds', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: 2, startRound: 3 }),
                new RoundsEndBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // First next() should complete since 3 > 2
            advanceBehaviors(behaviors, ctx);

            expect(runtime.completionReason).toBe('rounds-exhausted');
        });
    });
});
