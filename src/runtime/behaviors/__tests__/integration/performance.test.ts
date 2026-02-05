/**
 * Performance Integration Tests
 * 
 * Tests performance characteristics of behavior compositions
 * to ensure they meet runtime requirements.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
    createMockRuntime,
    createMockBlock,
    mountBehaviors,
    advanceBehaviors,
    unmountBehaviors,
    simulateTicks,
    MockRuntime,
    MockBlock
} from './test-helpers';

import { TimerInitBehavior } from '../../TimerInitBehavior';
import { TimerTickBehavior } from '../../TimerTickBehavior';
import { TimerCompletionBehavior } from '../../TimerCompletionBehavior';
import { TimerPauseBehavior } from '../../TimerPauseBehavior';
import { TimerOutputBehavior } from '../../TimerOutputBehavior';
import { RoundInitBehavior } from '../../RoundInitBehavior';
import { RoundAdvanceBehavior } from '../../RoundAdvanceBehavior';
import { RoundCompletionBehavior } from '../../RoundCompletionBehavior';
import { RoundDisplayBehavior } from '../../RoundDisplayBehavior';
import { RoundOutputBehavior } from '../../RoundOutputBehavior';
import { DisplayInitBehavior } from '../../DisplayInitBehavior';
import { HistoryRecordBehavior } from '../../HistoryRecordBehavior';
import { SoundCueBehavior } from '../../SoundCueBehavior';

describe('Performance Integration', () => {
    let runtime: MockRuntime;
    let block: MockBlock;

    beforeEach(() => {
        runtime = createMockRuntime(0);
        block = createMockBlock({ label: 'Performance Test' });
    });

    /**
     * Helper to measure execution time.
     */
    function measureTime(fn: () => void): number {
        const start = performance.now();
        fn();
        return performance.now() - start;
    }

    describe('Mount Performance', () => {
        it('should mount simple behavior in < 5ms', () => {
            const behaviors = [
                new DisplayInitBehavior({ mode: 'clock' })
            ];

            const time = measureTime(() => {
                mountBehaviors(behaviors, runtime, block);
            });

            expect(time).toBeLessThan(5);
        });

        it('should mount full AMRAP composition in < 10ms', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'down', durationMs: 600000 }),
                new TimerTickBehavior(),
                new TimerCompletionBehavior(),
                new TimerPauseBehavior(),
                new RoundInitBehavior({ totalRounds: undefined }),
                new RoundAdvanceBehavior(),
                new RoundDisplayBehavior(),
                new DisplayInitBehavior({ mode: 'countdown' }),
                new TimerOutputBehavior(),
                new RoundOutputBehavior(),
                new HistoryRecordBehavior(),
                new SoundCueBehavior({ cues: [] })
            ];

            const time = measureTime(() => {
                mountBehaviors(behaviors, runtime, block);
            });

            expect(time).toBeLessThan(10);
        });

        it('should mount 100 blocks in < 100ms', () => {
            const time = measureTime(() => {
                for (let i = 0; i < 100; i++) {
                    const testBlock = createMockBlock({ label: `Block ${i}` });
                    mountBehaviors([
                        new TimerInitBehavior({ direction: 'up' }),
                        new RoundInitBehavior({ totalRounds: 5 }),
                        new DisplayInitBehavior({ mode: 'clock' })
                    ], createMockRuntime(), testBlock);
                }
            });

            expect(time).toBeLessThan(100);
        });
    });

    describe('Tick Performance', () => {
        it('should process 1000 ticks in < 50ms', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'up' }),
                new TimerTickBehavior(),
                new DisplayInitBehavior({ mode: 'clock' })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            const time = measureTime(() => {
                simulateTicks(runtime, ctx, 1000, 16); // 60fps for ~16 seconds
            });

            expect(time).toBeLessThan(50);
        });

        it('should process tick with full behavior set in < 1ms average', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'down', durationMs: 600000 }),
                new TimerTickBehavior(),
                new TimerCompletionBehavior(),
                new RoundDisplayBehavior(),
                new DisplayInitBehavior({ mode: 'countdown' })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            const tickCount = 100;
            const time = measureTime(() => {
                simulateTicks(runtime, ctx, tickCount, 16);
            });

            const avgTime = time / tickCount;
            expect(avgTime).toBeLessThan(1);
        });
    });

    describe('Advance Performance', () => {
        it('should process 1000 advances in < 100ms', () => {
            const behaviors = [
                new RoundInitBehavior({ totalRounds: undefined }),
                new RoundAdvanceBehavior(),
                new RoundDisplayBehavior(),
                new DisplayInitBehavior({ mode: 'clock' }),
                new RoundOutputBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            const time = measureTime(() => {
                for (let i = 0; i < 1000; i++) {
                    advanceBehaviors(behaviors, ctx);
                }
            });

            expect(time).toBeLessThan(100);
        });

        it('should handle rapid advance without memory bloat', () => {
            const behaviors = [
                new RoundInitBehavior({ totalRounds: undefined }),
                new RoundAdvanceBehavior(),
                new RoundOutputBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Advance many times
            for (let i = 0; i < 10000; i++) {
                advanceBehaviors(behaviors, ctx);
            }

            // Check output count is reasonable (not growing unbounded)
            // Each advance emits 1 milestone output (no events from RoundAdvanceBehavior)
            // RoundOutputBehavior does not emit segment on mount (SegmentOutputBehavior handles that)
            expect(runtime.events.length).toBe(0); // No internal events emitted
            expect(runtime.outputs.length).toBe(10000);
        });
    });

    describe('Memory Performance', () => {
        it('should not create excessive objects per tick', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'up' }),
                new TimerTickBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            const initialEventCount = runtime.events.length;

            // Process 100 ticks
            simulateTicks(runtime, ctx, 100, 16);

            // Each tick should emit at most 1-2 events
            const eventsPerTick = (runtime.events.length - initialEventCount) / 100;
            expect(eventsPerTick).toBeLessThanOrEqual(2);
        });

        it('should maintain stable memory across long workout', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'up' }),
                new TimerTickBehavior(),
                new TimerPauseBehavior(),
                new RoundInitBehavior({ totalRounds: undefined }),
                new RoundAdvanceBehavior(),
                new RoundDisplayBehavior(),
                new DisplayInitBehavior({ mode: 'clock' })
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Simulate a long workout: 30 minutes at 60fps
            // We'll do 10 seconds worth to keep test fast
            for (let second = 0; second < 10; second++) {
                simulateTicks(runtime, ctx, 60, 16);
                if (second % 2 === 0) {
                    advanceBehaviors(behaviors, ctx);
                }
            }

            // Memory map should not grow unboundedly
            expect(block.memory.size).toBeLessThanOrEqual(10);
        });
    });

    describe('Unmount Performance', () => {
        it('should unmount quickly after long workout', () => {
            const behaviors = [
                new TimerInitBehavior({ direction: 'up' }),
                new TimerTickBehavior(),
                new TimerPauseBehavior(),
                new RoundInitBehavior({ totalRounds: undefined }),
                new RoundAdvanceBehavior(),
                new DisplayInitBehavior({ mode: 'clock' }),
                new HistoryRecordBehavior(),
                new TimerOutputBehavior(),
                new RoundOutputBehavior()
            ];
            const ctx = mountBehaviors(behaviors, runtime, block);

            // Simulate some workout
            for (let i = 0; i < 100; i++) {
                simulateTicks(runtime, ctx, 10, 100);
                advanceBehaviors(behaviors, ctx);
            }

            const time = measureTime(() => {
                unmountBehaviors(behaviors, ctx);
            });

            expect(time).toBeLessThan(10);
        });
    });

    describe('Concurrent Block Simulation', () => {
        it('should handle 10 concurrent blocks efficiently', () => {
            const blockCount = 10;
            const blocks: { block: MockBlock; runtime: MockRuntime; ctx: any; behaviors: any[] }[] = [];

            // Create 10 blocks with different patterns
            const setupTime = measureTime(() => {
                for (let i = 0; i < blockCount; i++) {
                    const testRuntime = createMockRuntime(0);
                    const testBlock = createMockBlock({ label: `Block ${i}` });
                    const behaviors = [
                        new TimerInitBehavior({ direction: 'up' }),
                        new TimerTickBehavior(),
                        new RoundInitBehavior({ totalRounds: 5 }),
                        new RoundAdvanceBehavior(),
                        new RoundCompletionBehavior()
                    ];
                    const ctx = mountBehaviors(behaviors, testRuntime, testBlock);
                    blocks.push({ block: testBlock, runtime: testRuntime, ctx, behaviors });
                }
            });

            expect(setupTime).toBeLessThan(50);

            // Simulate ticks on all blocks
            const tickTime = measureTime(() => {
                for (let tick = 0; tick < 100; tick++) {
                    for (const { runtime: r, ctx } of blocks) {
                        r.clock.advance(16);
                        simulateTicks(r, ctx, 1, 0);
                    }
                }
            });

            expect(tickTime).toBeLessThan(100);
        });
    });
});
