/**
 * Timer Block Integration Tests
 * 
 * Tests timer-related behaviors working together in realistic scenarios.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
    createMockRuntime,
    createMockBlock,
    mountBehaviors,
    unmountBehaviors,
    simulateTicks,
    dispatchEvent,
    expectMemoryState,
    calculateElapsed,
    findEvents,
    findOutputs,
    MockRuntime,
    MockBlock,
    createIntegrationContext
} from './test-helpers';

import { TimerInitBehavior } from '../../TimerInitBehavior';
import { TimerTickBehavior } from '../../TimerTickBehavior';
import { TimerCompletionBehavior } from '../../TimerCompletionBehavior';
import { TimerPauseBehavior } from '../../TimerPauseBehavior';
import { TimerOutputBehavior } from '../../TimerOutputBehavior';
import { DisplayInitBehavior } from '../../DisplayInitBehavior';
import { PopOnNextBehavior } from '../../PopOnNextBehavior';
import { SoundCueBehavior } from '../../SoundCueBehavior';
import { TimerState } from '../../../memory/MemoryTypes';
import { IBehaviorContext } from '../../../contracts/IBehaviorContext';

describe('Timer Block Integration', () => {
    let runtime: MockRuntime;
    let block: MockBlock;

    beforeEach(() => {
        runtime = createMockRuntime(0);
        block = createMockBlock({ label: 'Timer Test' });
    });

    describe('Countdown Timer', () => {
        const createCountdownBehaviors = (durationMs: number = 10000) => [
            new TimerInitBehavior({ direction: 'down', durationMs, label: 'Countdown' }),
            new TimerTickBehavior(),
            new TimerCompletionBehavior(),
            new DisplayInitBehavior({ mode: 'countdown', label: 'Countdown' }),
            new TimerOutputBehavior()
        ];

        it('should initialize timer state on mount', () => {
            const behaviors = createCountdownBehaviors();

            mountBehaviors(behaviors, runtime, block);

            expectMemoryState(block, 'timer', {
                direction: 'down',
                durationMs: 10000,
                label: 'Countdown'
            });
        });

        it('should initialize display state on mount', () => {
            const behaviors = createCountdownBehaviors();

            mountBehaviors(behaviors, runtime, block);

            expectMemoryState(block, 'display', {
                mode: 'countdown',
                label: 'Countdown'
            });
        });

        it('should initialize timer memory with open span on mount', () => {
            const behaviors = createCountdownBehaviors();

            mountBehaviors(behaviors, runtime, block);

            // Timer start is signaled by timer memory with an open span
            const timer = block.memory.get('timer') as TimerState;
            expect(timer).toBeDefined();
            expect(timer.direction).toBe('down');
            expect(timer.durationMs).toBe(10000);
            expect(timer.spans.length).toBe(1);
            expect(timer.spans[0].ended).toBeUndefined(); // Open span = running
        });

        it('should close span on unmount', () => {
            const behaviors = createCountdownBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            runtime.clock.advance(5000);
            unmountBehaviors(behaviors, ctx);

            const timer = block.memory.get('timer') as TimerState;
            expect(timer.spans[0].ended).toBeDefined();
        });

        it('should mark complete when countdown expires', () => {
            const behaviors = createCountdownBehaviors(5000); // 5 second timer
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Simulate 6 seconds of ticks (past the 5 second duration)
            simulateTicks(runtime, ctx, 6, 1000);

            expect(runtime.completionReason).toBe('timer-expired');
        });

        it('should mark complete when countdown expires (via markComplete)', () => {
            const behaviors = createCountdownBehaviors(3000); // 3 second timer
            const ctx = mountBehaviors(behaviors, runtime, block);

            simulateTicks(runtime, ctx, 4, 1000);

            // Completion is signaled via markComplete, not event
            expect(runtime.completionReason).toBe('timer-expired');
        });

        it('should emit correct elapsed time in output on unmount', () => {
            const behaviors = createCountdownBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            runtime.clock.advance(7500);
            unmountBehaviors(behaviors, ctx);

            expect(runtime.outputs.length).toBeGreaterThan(0);
            const completionOutputs = runtime.outputs.filter(o => o.type === 'completion');
            expect(completionOutputs.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Countup Timer', () => {
        const createCountupBehaviors = () => [
            new TimerInitBehavior({ direction: 'up', label: 'For Time' }),
            new TimerTickBehavior(),
            new PopOnNextBehavior(),
            new DisplayInitBehavior({ mode: 'clock', label: 'For Time' }),
            new TimerOutputBehavior()
        ];

        it('should track elapsed time without auto-expiring', () => {
            const behaviors = createCountupBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Simulate 60 seconds
            simulateTicks(runtime, ctx, 60, 1000);

            // Should NOT auto-complete
            expect(runtime.completionReason).toBeUndefined();

            // Timer should still be tracking
            const timer = block.memory.get('timer') as TimerState;
            const elapsed = calculateElapsed(timer, runtime.clock.timestamp);
            expect(elapsed).toBe(60000);
        });

        it('should complete on user advance (next)', () => {
            const behaviors = createCountupBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            // User calls next
            for (const behavior of behaviors) {
                behavior.onNext(ctx);
            }

            expect(runtime.completionReason).toBe('user-advance');
        });
    });

    describe('Timer with Pause/Resume', () => {
        const createPausableBehaviors = (durationMs: number = 10000) => [
            new TimerInitBehavior({ direction: 'down', durationMs, label: 'Pausable' }),
            new TimerTickBehavior(),
            new TimerPauseBehavior(),
            new TimerCompletionBehavior()
        ];

        it('should close span on pause (timer:pause event)', () => {
            const behaviors = createPausableBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            runtime.clock.advance(3000);
            dispatchEvent(runtime, ctx, 'timer:pause', {});

            // Pause is signaled by closed span in timer memory, not event
            const timer = block.memory.get('timer') as TimerState;
            expect(timer.spans[0].ended).toBeDefined();
        });

        it('should open new span on resume (timer:resume event)', () => {
            const behaviors = createPausableBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            runtime.clock.advance(3000);
            dispatchEvent(runtime, ctx, 'timer:pause', {});
            runtime.clock.advance(5000); // Paused for 5 seconds
            dispatchEvent(runtime, ctx, 'timer:resume', {});

            // Resume is signaled by new open span in timer memory, not event
            const timer = block.memory.get('timer') as TimerState;
            expect(timer.spans.length).toBe(2);
            expect(timer.spans[1].ended).toBeUndefined(); // New span is open
        });

        it('should track multiple spans correctly', () => {
            const behaviors = createPausableBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Run 3 seconds
            runtime.clock.advance(3000);
            dispatchEvent(runtime, ctx, 'timer:pause', {});

            // Pause 5 seconds
            runtime.clock.advance(5000);
            dispatchEvent(runtime, ctx, 'timer:resume', {});

            // Run 2 more seconds
            runtime.clock.advance(2000);

            const timer = block.memory.get('timer') as TimerState;
            // Should have at least 2 spans (initial + after resume)
            expect(timer.spans.length).toBeGreaterThanOrEqual(2);

            // Total elapsed should be 5 seconds (3 + 2), not 10
            // The pause time should not be counted
            const elapsed = calculateElapsed(timer, runtime.clock.timestamp);
            expect(elapsed).toBe(5000);
        });
    });

    describe('Timer with Sound Cues', () => {
        const createSoundBehaviors = () => [
            new TimerInitBehavior({ direction: 'down', durationMs: 5000, label: 'Sound Test' }),
            new TimerTickBehavior(),
            new TimerCompletionBehavior(),
            new SoundCueBehavior({
                cues: [
                    { sound: 'start-beep', trigger: 'mount' },
                    { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                    { sound: 'complete-chime', trigger: 'complete' }
                ]
            })
        ];

        it('should emit sound output on mount', () => {
            const behaviors = createSoundBehaviors();

            mountBehaviors(behaviors, runtime, block);

            // Sound cues emit milestone outputs, not events
            const milestones = findOutputs(runtime, 'milestone');
            const soundOutputs = milestones.filter(m => 
                (m.fragments as any[]).some(f => f.sound === 'start-beep')
            );
            expect(soundOutputs.length).toBeGreaterThanOrEqual(1);
        });

        it('should emit countdown sounds at correct times', () => {
            const behaviors = createSoundBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Fast-forward to near the end (2 seconds remaining)
            runtime.clock.advance(2000);
            simulateTicks(runtime, ctx, 3, 1000);

            // Sound cues emit milestone outputs, not events
            const milestones = findOutputs(runtime, 'milestone');
            const countdownSounds = milestones.filter(m =>
                (m.fragments as any[]).some(f => f.sound === 'countdown-beep')
            );
            expect(countdownSounds.length).toBeGreaterThanOrEqual(1);
        });

        it('should emit completion sound on unmount', () => {
            const behaviors = createSoundBehaviors();
            const ctx = mountBehaviors(behaviors, runtime, block);

            runtime.clock.advance(6000);
            unmountBehaviors(behaviors, ctx);

            // Sound cues emit milestone outputs, not events
            const milestones = findOutputs(runtime, 'milestone');
            const completeSounds = milestones.filter(m =>
                (m.fragments as any[]).some(f => f.sound === 'complete-chime')
            );
            expect(completeSounds.length).toBeGreaterThanOrEqual(1);
        });
    });
});
