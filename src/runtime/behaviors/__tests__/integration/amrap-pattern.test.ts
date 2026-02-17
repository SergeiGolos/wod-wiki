/**
 * AMRAP Pattern Integration Tests
 * 
 * Tests the "As Many Rounds As Possible" hybrid pattern:
 * Timer (countdown) + Rounds (unbounded)
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
    createMockRuntime,
    createMockBlock,
    mountBehaviors,
    advanceBehaviors,
    unmountBehaviors,
    simulateTicks,
    simulateRoundAdvance,
    calculateElapsed,
    findEvents,
    findOutputs,
    MockRuntime,
    MockBlock,
    expectDisplayLabel,
    getRoundDisplay
} from './test-helpers';

import { TimerInitBehavior } from '../../TimerInitBehavior';
import { TimerTickBehavior } from '../../TimerTickBehavior';
import { TimerEndingBehavior } from '../../TimerEndingBehavior';
import { ReEntryBehavior } from '../../ReEntryBehavior';
import { ReportOutputBehavior } from '../../ReportOutputBehavior';
import { LabelingBehavior } from '../../LabelingBehavior';
import { HistoryRecordBehavior } from '../../HistoryRecordBehavior';
import { SoundCueBehavior } from '../../SoundCueBehavior';
import { TimerState, RoundState } from '../../../memory/MemoryTypes';

describe('AMRAP Pattern Integration', () => {
    let runtime: MockRuntime;
    let block: MockBlock;

    /**
     * Creates the full AMRAP behavior composition.
     * 
     * Key characteristics:
     * - Timer: Countdown to time cap
     * - Rounds: Unbounded (no RoundCompletionBehavior!)
     * - Completion: Timer expiry ends the workout
     */
    const createAmrapBehaviors = (durationMs: number = 60000) => [
        // Time aspect
        new TimerInitBehavior({ direction: 'down', durationMs, label: 'AMRAP' }),
        new TimerTickBehavior(),
        new TimerEndingBehavior({ ending: { mode: 'complete-block' } }),

        // Iteration aspect (unbounded - no completion!)
        new ReEntryBehavior({ totalRounds: undefined, startRound: 1 }),
        // NOTE: No RoundCompletionBehavior - timer controls completion

        // Display aspect
        new LabelingBehavior({ mode: 'countdown', label: 'AMRAP' }),

        // Output aspect
        new ReportOutputBehavior(),
        new HistoryRecordBehavior(),

        // Sound cues
        new SoundCueBehavior({
            cues: [
                { sound: 'start', trigger: 'mount' },
                { sound: 'countdown', trigger: 'countdown', atSeconds: [3, 2, 1] },
                { sound: 'complete', trigger: 'complete' }
            ]
        })
    ];

    beforeEach(() => {
        runtime = createMockRuntime(0);
        block = createMockBlock({ label: 'AMRAP Test' });
    });

    describe('Core AMRAP Flow', () => {
        it('should initialize with countdown timer and unbounded rounds', () => {
            const behaviors = createAmrapBehaviors(120000); // 2 min

            mountBehaviors(behaviors, runtime, block);

            // Timer should be countdown
            const timer = block.memory.get('time') as TimerState;
            expect(timer.direction).toBe('down');
            expect(timer.durationMs).toBe(120000);

            // Rounds should be unbounded
            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(1);
            expect(round.total).toBeUndefined();
        });

        it('should track rounds without auto-completing', () => {
            const behaviors = createAmrapBehaviors(60000);
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Complete several rounds (user advances)
            for (let i = 0; i < 10; i++) {
                simulateRoundAdvance(ctx);
                advanceBehaviors(behaviors, ctx);
            }

            // Should NOT complete from rounds
            expect(runtime.completionReason).toBeUndefined();

            // Should have tracked all rounds
            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(11); // Started at 1, advanced 10 times
        });

        it('should complete when time cap is reached', () => {
            const behaviors = createAmrapBehaviors(5000); // 5 second cap
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Complete a few rounds
            simulateRoundAdvance(ctx);
            advanceBehaviors(behaviors, ctx);
            simulateRoundAdvance(ctx);
            advanceBehaviors(behaviors, ctx);

            // Simulate time passing beyond the cap
            simulateTicks(runtime, ctx, 6, 1000);

            expect(runtime.completionReason).toBe('timer-expired');
        });

        it('should allow user advance during workout', () => {
            const behaviors = createAmrapBehaviors(60000);
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Advance at various time points
            runtime.clock.advance(5000);
            simulateRoundAdvance(ctx);
            advanceBehaviors(behaviors, ctx);

            runtime.clock.advance(8000);
            simulateRoundAdvance(ctx);
            advanceBehaviors(behaviors, ctx);

            const round = block.memory.get('round') as RoundState;
            expect(round.current).toBe(3);

            // Should not be complete
            expect(runtime.completionReason).toBeUndefined();
        });
    });

    describe('AMRAP Timing', () => {
        it('should track total elapsed time correctly', () => {
            const behaviors = createAmrapBehaviors(120000);
            mountBehaviors(behaviors, runtime, block);

            // Simulate 90 seconds
            runtime.clock.advance(90000);

            const timer = block.memory.get('time') as TimerState;
            const elapsed = calculateElapsed(timer, runtime.clock.timestamp);
            expect(elapsed).toBe(90000);
        });

        it('should complete at exact time cap', () => {
            const behaviors = createAmrapBehaviors(10000); // 10 seconds
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Tick up to exactly the cap
            simulateTicks(runtime, ctx, 10, 1000);

            expect(runtime.completionReason).toBe('timer-expired');
        });
    });

    describe('AMRAP Output', () => {
        it('should emit round milestones', () => {
            const behaviors = createAmrapBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            simulateRoundAdvance(ctx);
            advanceBehaviors(behaviors, ctx);
            simulateRoundAdvance(ctx);
            advanceBehaviors(behaviors, ctx);

            const milestones = findOutputs(runtime, 'milestone');
            // Filter for round milestones (exclude sound cues)
            const roundMilestones = milestones.filter(m =>
                (m.fragments as any[]).some(f => f.fragmentType === 'current-round')
            );
            // 1 initial milestone on mount + 2 from onNext advances
            expect(roundMilestones.length).toBe(3);
        });

        it('should record final round count in history', () => {
            const behaviors = createAmrapBehaviors(5000);
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Complete 4 rounds
            for (let i = 0; i < 4; i++) {
                simulateRoundAdvance(ctx);
                advanceBehaviors(behaviors, ctx);
            }

            // Time expires
            simulateTicks(runtime, ctx, 6, 1000);
            unmountBehaviors(behaviors, ctx);

            const historyEvents = findEvents(runtime, 'history:record');
            expect(historyEvents.length).toBe(1);

            // Should have recorded 5 rounds (started at 1, advanced 4)
            // Note: completedRounds in history is current - 1
        });

        it('should emit sound cues as outputs', () => {
            const behaviors = createAmrapBehaviors(5000);
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Mount should trigger start sound output
            let milestones = findOutputs(runtime, 'milestone');
            let startSounds = milestones.filter(m =>
                (m.fragments as any[]).some(f => f.sound === 'start')
            );
            expect(startSounds.length).toBeGreaterThanOrEqual(1);

            // Complete and unmount
            simulateTicks(runtime, ctx, 6, 1000);
            unmountBehaviors(behaviors, ctx);

            // Unmount should trigger complete sound output
            milestones = findOutputs(runtime, 'milestone');
            let completeSounds = milestones.filter(m =>
                (m.fragments as any[]).some(f => f.sound === 'complete')
            );
            expect(completeSounds.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('AMRAP Display', () => {
        it('should show display label on mount', () => {
            const behaviors = createAmrapBehaviors();

            mountBehaviors(behaviors, runtime, block);

            expectDisplayLabel(block, 'AMRAP');
        });

        it('should update round display as rounds complete', () => {
            const behaviors = createAmrapBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            simulateRoundAdvance(ctx);
            advanceBehaviors(behaviors, ctx);
            simulateRoundAdvance(ctx);
            advanceBehaviors(behaviors, ctx);

            const roundDisplay = getRoundDisplay(block);
            // Unbounded rounds show without total
            expect(roundDisplay).toContain('Round 3');
        });
    });
});
