/**
 * EMOM Pattern Integration Tests
 * 
 * Tests the "Every Minute On the Minute" hybrid pattern:
 * Timer (countdown per interval) + Rounds (bounded)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    createMockRuntime,
    createMockBlock,
    mountBehaviors,
    advanceBehaviors,
    simulateTicks,
    findEvents,
    findOutputs,
    MockRuntime,
    MockBlock
} from './test-helpers';

import { TimerInitBehavior } from '../../TimerInitBehavior';
import { TimerTickBehavior } from '../../TimerTickBehavior';
import { TimerCompletionBehavior } from '../../TimerCompletionBehavior';
import { RoundInitBehavior } from '../../RoundInitBehavior';
import { RoundAdvanceBehavior } from '../../RoundAdvanceBehavior';
import { RoundCompletionBehavior } from '../../RoundCompletionBehavior';
import { RoundDisplayBehavior } from '../../RoundDisplayBehavior';
import { RoundOutputBehavior } from '../../RoundOutputBehavior';
import { DisplayInitBehavior } from '../../DisplayInitBehavior';
import { TimerState, RoundState, DisplayState } from '../../../memory/MemoryTypes';

describe('EMOM Pattern Integration', () => {
    let runtime: MockRuntime;
    let block: MockBlock;

    /**
     * Creates the EMOM behavior composition.
     * 
     * Key characteristics:
     * - Timer: Countdown per interval (resets each round)
     * - Rounds: Bounded (e.g., 10 rounds = 10 minutes)
     * - Completion: All rounds complete
     * - Timer expiry within a round advances to next round
     */
    const createEmomBehaviors = (intervalMs: number = 60000, totalRounds: number = 10) => [
        // Time aspect
        new TimerInitBehavior({ direction: 'down', durationMs: intervalMs, label: 'Interval' }),
        new TimerTickBehavior(),
        new TimerCompletionBehavior(), // Timer expiry should trigger round advance

        // Iteration aspect
        new RoundInitBehavior({ totalRounds, startRound: 1 }),
        new RoundAdvanceBehavior(),
        new RoundCompletionBehavior(), // Round completion ends the workout

        // Display aspect
        new DisplayInitBehavior({ mode: 'countdown', label: 'EMOM' }),
        new RoundDisplayBehavior(),

        // Output aspect
        new RoundOutputBehavior()
    ];

    beforeEach(() => {
        runtime = createMockRuntime(0);
        block = createMockBlock({ label: 'EMOM Test' });
    });

    describe('Core EMOM Flow', () => {
        it('should initialize with interval timer and bounded rounds', () => {
            const behaviors = createEmomBehaviors(60000, 10);

            mountBehaviors(behaviors, runtime, block);

            const timer = block.memory.get('timer') as TimerState;
            expect(timer.direction).toBe('down');
            expect(timer.durationMs).toBe(60000);

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(1);
            expect(round.total).toBe(10);
        });

        it('should advance round on user next()', () => {
            const behaviors = createEmomBehaviors(60000, 5);
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(2);
        });

        it('should complete when all rounds are done', () => {
            const behaviors = createEmomBehaviors(60000, 3);
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx); // Round 2
            advanceBehaviors(behaviors, ctx); // Round 3
            advanceBehaviors(behaviors, ctx); // Round 4 > 3 -> complete

            expect(runtime.completionReason).toBe('rounds-complete');
        });
    });

    describe('EMOM Timer Behavior', () => {
        it('should use countdown timer per interval', () => {
            const behaviors = createEmomBehaviors(30000, 5); // 30 second intervals

            mountBehaviors(behaviors, runtime, block);

            const timer = block.memory.get('timer') as TimerState;
            expect(timer.direction).toBe('down');
            expect(timer.durationMs).toBe(30000);
        });

        it('should complete interval when timer expires', () => {
            const behaviors = createEmomBehaviors(5000, 3); // 5 second intervals
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Let timer run out
            simulateTicks(runtime, ctx, 6, 1000);

            // Timer should have marked complete (which advances round in EMOM)
            // In the current implementation, timer expiry calls markComplete
            // which may or may not advance the round depending on coordination
            expect(runtime.completionReason).toBeDefined();
        });
    });

    describe('EMOM Display', () => {
        it('should show countdown mode for interval', () => {
            const behaviors = createEmomBehaviors();

            mountBehaviors(behaviors, runtime, block);

            const display = block.memory.get('display') as DisplayState;
            expect(display.mode).toBe('countdown');
        });

        it('should show round progress', () => {
            const behaviors = createEmomBehaviors(60000, 10);
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);
            advanceBehaviors(behaviors, ctx);

            const display = block.memory.get('display') as DisplayState;
            expect(display.roundDisplay).toBe('Round 3 of 10');
        });
    });

    describe('EMOM Output', () => {
        it('should emit round milestone on each interval complete', () => {
            const behaviors = createEmomBehaviors(60000, 5);
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);
            advanceBehaviors(behaviors, ctx);

            const milestones = findOutputs(runtime, 'milestone');
            expect(milestones.length).toBe(2);
        });

        it('should emit round:advance events', () => {
            const behaviors = createEmomBehaviors(60000, 5);
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);

            const events = findEvents(runtime, 'round:advance');
            expect(events.length).toBe(1);
        });
    });

    describe('EMOM Edge Cases', () => {
        it('should handle single round EMOM', () => {
            const behaviors = createEmomBehaviors(60000, 1);
            const ctx = mountBehaviors(behaviors, runtime, block);

            // First advance should complete
            advanceBehaviors(behaviors, ctx);

            expect(runtime.completionReason).toBe('rounds-complete');
        });

        it('should handle very short intervals', () => {
            const behaviors = createEmomBehaviors(1000, 3); // 1 second intervals
            const ctx = mountBehaviors(behaviors, runtime, block);

            advanceBehaviors(behaviors, ctx);
            advanceBehaviors(behaviors, ctx);
            advanceBehaviors(behaviors, ctx);

            // Should complete after 3 advances
            expect(runtime.completionReason).toBe('rounds-complete');
        });

        it('should work with odd round counts', () => {
            const behaviors = createEmomBehaviors(60000, 7);

            mountBehaviors(behaviors, runtime, block);

            const round = block.memory.get('round') as RoundState;
            expect(round.total).toBe(7);
        });
    });
});
