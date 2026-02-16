/**
 * Edge Cases Integration Tests
 * 
 * Tests unusual and boundary conditions for behavior compositions.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
    createMockRuntime,
    createMockBlock,
    mountBehaviors,
    advanceBehaviors,
    unmountBehaviors,
    simulateTicks,
    dispatchEvent,
    MockRuntime,
    MockBlock
} from './test-helpers';

import { TimerInitBehavior } from '../../TimerInitBehavior';
import { TimerTickBehavior } from '../../TimerTickBehavior';
import { TimerEndingBehavior } from '../../TimerEndingBehavior';
import { TimerPauseBehavior } from '../../TimerPauseBehavior';
import { ReEntryBehavior } from '../../ReEntryBehavior';
import { RoundsEndBehavior } from '../../RoundsEndBehavior';
import { LabelingBehavior } from '../../LabelingBehavior';
import { LeafExitBehavior } from '../../LeafExitBehavior';
import { TimerState, RoundState } from '../../../memory/MemoryTypes';

describe('Edge Cases Integration', () => {
    let runtime: MockRuntime;
    let block: MockBlock;

    beforeEach(() => {
        runtime = createMockRuntime(0);
        block = createMockBlock({ label: 'Edge Case Test' });
    });

    describe('Empty/Minimal Blocks', () => {
        it('should handle block with only PopOnNext', () => {
            const behaviors = [new LeafExitBehavior()];
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);

            expect(runtime.completionReason).toBe('user-advance');
        });

        it('should handle block with only display', () => {
            const behaviors = [
                new LabelingBehavior({ mode: 'clock', label: 'Display Only' })
            ];

            const ctx = mountBehaviors(behaviors, runtime, block);

            const display = block.memory.get('display');
            expect(display).toBeDefined();
        });
    });

    describe('Multiple Completion Sources', () => {
        it('should complete on first trigger (PopOnNext)', () => {
            const behaviors = [
                new LeafExitBehavior({ onNext: true, onEvents: ['custom:complete'] })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Trigger next first
            advanceBehaviors(behaviors, ctx);

            expect(runtime.completionReason).toBe('user-advance');
        });

        it('should complete on first trigger (PopOnEvent)', () => {
            const behaviors = [
                new LeafExitBehavior({ onNext: true, onEvents: ['custom:complete'] })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Trigger event first
            dispatchEvent(runtime, ctx, 'custom:complete', {});

            expect(runtime.completionReason).toBe('event:custom:complete');
        });

        it('should handle timer + round completion (timer wins)', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'down', durationMs: 5000 }),
                new TimerTickBehavior(),
                new TimerEndingBehavior({ ending: { mode: 'complete-block' } }),
                new ReEntryBehavior({ totalRounds: 10 }),
                new RoundsEndBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Complete only 2 rounds
            advanceBehaviors(behaviors, ctx);
            advanceBehaviors(behaviors, ctx);

            // Then timer expires
            simulateTicks(runtime, ctx, 6, 1000);

            expect(runtime.completionReason).toBe('timer-expired');
        });

        it('should handle timer + round completion (rounds win)', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'down', durationMs: 60000 }),
                new TimerTickBehavior(),
                new TimerEndingBehavior({ ending: { mode: 'complete-block' } }),
                new ReEntryBehavior({ totalRounds: 2 }),
                new RoundsEndBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Complete rounds before timer
            advanceBehaviors(behaviors, ctx); // Round 2
            advanceBehaviors(behaviors, ctx); // Round 3 > 2 -> complete

            expect(runtime.completionReason).toBe('rounds-exhausted');
        });
    });

    describe('Rapid User Actions', () => {
        it('should handle rapid successive next() calls', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: 100 }),
                new RoundsEndBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Rapid-fire 50 advances
            for (let i = 0; i < 50; i++) {
                advanceBehaviors(behaviors, ctx);
            }

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(51);
        });

        it('should handle next() after completion', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: 2 }),
                new RoundsEndBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx); // Round 2
            advanceBehaviors(behaviors, ctx); // Complete

            // Additional advances after completion
            advanceBehaviors(behaviors, ctx);
            advanceBehaviors(behaviors, ctx);

            // Should still be complete
            expect(runtime.completionReason).toBe('rounds-exhausted');

            // Round may continue incrementing (behavior doesn't check isComplete)
            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBeGreaterThanOrEqual(4);
        });
    });

    describe('Timer Edge Cases', () => {
        it('should handle zero duration timer', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'down', durationMs: 0 }),
                new TimerTickBehavior(),
                new TimerEndingBehavior({ ending: { mode: 'complete-block' } })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // First tick should complete
            simulateTicks(runtime, ctx, 1, 100);

            expect(runtime.completionReason).toBe('timer-expired');
        });

        it('should handle very long duration timer', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'down', durationMs: 3600000 }), // 1 hour
                new TimerTickBehavior(),
                new TimerEndingBehavior({ ending: { mode: 'complete-block' } })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Advance 30 minutes
            simulateTicks(runtime, ctx, 1800, 1000);

            // Should not complete yet
            expect(runtime.completionReason).toBeUndefined();
        });

        it('should handle pause/resume spam', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'down', durationMs: 10000 }),
                new TimerTickBehavior(),
                new TimerPauseBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            for (let i = 0; i < 10; i++) {
                runtime.clock.advance(100);
                dispatchEvent(runtime, ctx, 'timer:pause', {});
                runtime.clock.advance(100);
                dispatchEvent(runtime, ctx, 'timer:resume', {});
            }

            const timer = block.memory.get('timer') as TimerState;
            // Should have many spans
            expect(timer.spans.length).toBeGreaterThan(1);
        });
    });

    describe('Round Edge Cases', () => {
        it('should handle very high round counts', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: 10000 })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Advance 1000 times
            for (let i = 0; i < 1000; i++) {
                advanceBehaviors(behaviors, ctx);
            }

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(1001);
        });

        it('should handle startRound of 0', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: 5, startRound: 0 })
            ];

            const ctx = mountBehaviors(behaviors, runtime, block);

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(0);
        });

        it('should handle negative startRound (defensive)', () => {
            const behaviors = [
                new ReEntryBehavior({ totalRounds: 5, startRound: -1 })
            ];

            mountBehaviors(behaviors, runtime, block);

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(-1);
        });
    });

    describe('Memory State Preservation', () => {
        it('should preserve memory across mount/unmount cycle', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'up', label: 'Preserved' }),
                new ReEntryBehavior({ totalRounds: 5 })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            runtime.clock.advance(5000);

            // Memory exists before unmount
            expect(block.memory.get('timer')).toBeDefined();
            expect(block.memory.get('round')).toBeDefined();

            unmountBehaviors(behaviors, ctx);

            // Memory still exists after unmount (behaviors don't clear it)
            expect(block.memory.get('round')).toBeDefined();
        });

        it('should handle remount with existing memory', () => {
            const behaviors1 = [
                new ReEntryBehavior({ totalRounds: 5, startRound: 1 })
            ];
            const ctx1 = mountBehaviors(behaviors1, runtime, block);

            advanceBehaviors(behaviors1, ctx1);
            advanceBehaviors(behaviors1, ctx1);

            // Now remount - ReEntryBehavior may overwrite
            const behaviors2 = [
                new ReEntryBehavior({ totalRounds: 5, startRound: 1 })
            ];
            mountBehaviors(behaviors2, runtime, block);

            // Check if reinitialize happened
            const round = block.memory.get('round') as RoundState;
            // Behavior should initialize to startRound, overwriting previous
            expect(round.current).toBe(1);
        });
    });

    describe('Event Subscription Edge Cases', () => {
        it('should handle multiple behaviors subscribing to same event', () => {
            const behaviors = [
                new TimerTickBehavior(),
                new TimerEndingBehavior({ ending: { mode: 'complete-block' } })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Both subscribe to tick
            expect(runtime.subscriptions.get('tick')?.length).toBeGreaterThanOrEqual(1);
        });

        it('should handle events with no subscribers', () => {
            const behaviors = [
                new LabelingBehavior({ mode: 'clock' })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // This should not throw
            expect(() => {
                dispatchEvent(runtime, ctx, 'nonexistent:event', {});
            }).not.toThrow();
        });
    });
});
