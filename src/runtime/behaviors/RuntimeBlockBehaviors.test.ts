import { describe, it, expect, beforeEach } from 'vitest';
import { RepeatingRepsBlock } from '../blocks/RepeatingRepsBlock';
import { RepeatingTimedBlock } from '../blocks/RepeatingTimedBlock';
import { RepeatingCountdownBlock } from '../blocks/RepeatingCountdownBlock';
import { EffortBlock } from '../blocks/EffortBlock';
import { TimerBlock } from '../blocks/TimerBlock';
import { BlockKey } from '../../BlockKey';
import { RuntimeMetric } from '../RuntimeMetric';
import { RuntimeMemory } from '../memory/RuntimeMemory';
import { ScriptRuntimeWithMemory } from '../ScriptRuntimeWithMemory';

describe('Runtime Block Lifecycle Alignment', () => {
    let memory: RuntimeMemory;
    let runtime: ScriptRuntimeWithMemory;

    beforeEach(() => {
        memory = new RuntimeMemory();
        runtime = new ScriptRuntimeWithMemory();
    });

    describe('RepeatingRepsBlock', () => {
        it('should implement RepeatingBlockBehavior with public metrics', () => {
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'repetitions', value: 10, unit: 'reps' }
                    ]
                }
            ];

            const block = new RepeatingRepsBlock(new BlockKey('test-repeating-reps'), metrics);
            block.setRuntime(runtime);
            
            // Test push behavior
            block.push(memory);

            // Should have private loop-state
            const loopState = block.getLoopState();
            expect(loopState.remainingRounds).toBe(3);
            expect(loopState.currentChildIndex).toBe(-1);

            // Should have public metrics snapshot
            const publicMetricsRef = block.getPublicMetricsReference();
            expect(publicMetricsRef).toBeDefined();
            expect(publicMetricsRef!.visibility).toBe('public');

            // Test behavior methods
            expect(block.hasNextChild()).toBe(true);
            block.advanceToNextChild();
            expect(block.getLoopState().currentChildIndex).toBe(0);
        });
    });

    describe('RepeatingTimedBlock', () => {
        it('should implement PublicSpanBehavior', () => {
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'rounds', value: 2, unit: 'rounds' },
                        { type: 'time', value: 30000, unit: 'ms' }
                    ]
                }
            ];

            const block = new RepeatingTimedBlock(new BlockKey('test-timed'), metrics);
            block.setRuntime(runtime);
            block.push(memory);

            // Should have public span reference
            const publicSpanRef = block.getPublicSpanReference();
            expect(publicSpanRef).toBeDefined();
            expect(publicSpanRef!.visibility).toBe('public');

            // Should create proper span structure
            const span = block.createPublicSpan();
            const result = span.create();
            expect(result.blockKey).toBe('test-timed');
            expect(result.duration).toBe(30000);
        });
    });

    describe('RepeatingCountdownBlock', () => {
        it('should handle countdown state in memory', () => {
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'rounds', value: 2, unit: 'rounds' },
                        { type: 'time', value: -60000, unit: 'ms' }
                    ]
                }
            ];

            const block = new RepeatingCountdownBlock(new BlockKey('test-countdown'), metrics);
            block.setRuntime(runtime);
            block.push(memory);

            // Should initialize countdown properly
            expect(block.isCountdownExpired()).toBe(false);

            // Test countdown tick
            const finished = block.tickCountdown(30000);
            expect(finished).toBe(false);

            // Countdown to completion
            const finished2 = block.tickCountdown(30000);
            expect(finished2).toBe(true);
            expect(block.isCountdownExpired()).toBe(true);
        });
    });

    describe('EffortBlock', () => {
        it('should implement PublicSpanBehavior and InheritMetricsBehavior', () => {
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'effort', value: 1, unit: 'effort' }
                    ]
                }
            ];

            const block = new EffortBlock(new BlockKey('test-effort'), metrics);
            block.setRuntime(runtime);
            block.push(memory);

            // Should have public span reference
            const publicSpanRef = block.getPublicSpanReference();
            expect(publicSpanRef).toBeDefined();
            expect(publicSpanRef!.visibility).toBe('public');

            // Should have inherited metrics reference
            const inheritedMetricsRef = block.getInheritedMetricsReference();
            expect(inheritedMetricsRef).toBeDefined();
            expect(inheritedMetricsRef!.visibility).toBe('public');

            // Should inherit own metrics when no parent metrics available
            const inheritedMetrics = block.getInheritedMetrics();
            expect(inheritedMetrics).toEqual(metrics);
        });
    });

    describe('TimerBlock', () => {
        it('should implement timer-specific behaviors', () => {
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'time', value: 10000, unit: 'ms' }
                    ]
                }
            ];

            const block = new TimerBlock(new BlockKey('test-timer'), metrics);
            block.setRuntime(runtime);
            block.push(memory);

            // Should have public span reference
            const publicSpanRef = block.getPublicSpanReference();
            expect(publicSpanRef).toBeDefined();
            expect(publicSpanRef!.visibility).toBe('public');

            // Should track duration
            expect(block.hasDurationElapsed()).toBe(false);

            // Test span creation
            const span = block.createPublicSpan();
            const result = span.create();
            expect(result.duration).toBe(10000);
        });
    });

    describe('Memory Visibility', () => {
        it('should properly manage public/private memory visibility', () => {
            const parentMetrics: RuntimeMetric[] = [
                {
                    sourceId: 'parent',
                    values: [{ type: 'rounds', value: 2, unit: 'rounds' }]
                }
            ];

            const childMetrics: RuntimeMetric[] = [
                {
                    sourceId: 'child',
                    values: [{ type: 'effort', value: 1, unit: 'effort' }]
                }
            ];

            const parentBlock = new RepeatingRepsBlock(new BlockKey('parent'), parentMetrics);
            const childBlock = new EffortBlock(new BlockKey('child'), childMetrics);

            parentBlock.setRuntime(runtime);
            childBlock.setRuntime(runtime);

            // Setup parent-child relationship via runtime stack
            runtime.stack.push(parentBlock);
            runtime.stack.push(childBlock);

            // Parent should have public metrics-snapshot
            const parentPublicMetrics = parentBlock.getPublicMetricsReference();
            expect(parentPublicMetrics).toBeDefined();
            expect(parentPublicMetrics!.visibility).toBe('public');

            // Child should be able to see parent's public memory
            const visibleMemory = childBlock['getVisibleMemory']();
            const publicMetricsFromParent = visibleMemory.filter(ref => 
                ref.type === 'metrics-snapshot' && ref.visibility === 'public'
            );
            expect(publicMetricsFromParent.length).toBeGreaterThan(0);
        });
    });
});