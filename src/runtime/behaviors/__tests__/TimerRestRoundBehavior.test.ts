import { describe, expect, it, vi, afterEach } from 'bun:test';
import { CountdownTimerBehavior } from '../CountdownTimerBehavior';
import { MetricType } from '../../../core/models/Metric';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { MemoryLocation } from '../../memory/MemoryLocation';
import { TimeSpan } from '../../models/TimeSpan';

describe('CountdownTimerBehavior - Round Increment', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    it('increments round in reset-interval mode when timer expires', () => {
        harness = new BehaviorTestHarness().withClock(new Date(1000));
        const behavior = new CountdownTimerBehavior({
            durationMs: 30000,
            mode: 'reset-interval'
        });
        const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });

        // Pre-seed round and time memory
        block.pushMemory(new MemoryLocation('round', [{
            type: MetricType.CurrentRound, image: '', origin: 'runtime' as any,
            value: { current: 1, total: 3 },
            current: 1, total: 3
        } as any]));
        block.pushMemory(new MemoryLocation('time', [{
            type: 0 as any, image: '', origin: 'runtime' as any,
            value: {
                spans: [new TimeSpan(1000)],
                direction: 'down',
                durationMs: 30000,
                label: 'Test'
            }
        }]));

        harness.push(block);
        harness.mount();

        // Trigger expiry via private method (testing internal logic)
        (behavior as any).handleExpiry(block.behaviorContext!, 'reset-interval');

        expect(block.recordings.updateMemory.some(u =>
            u.tag === 'round' &&
            u.metrics.some((m: any) => m.type === MetricType.CurrentRound && m.value === 2)
        )).toBe(true);
    });

    it('does not increment round in complete-block mode', () => {
        harness = new BehaviorTestHarness().withClock(new Date(1000));
        const behavior = new CountdownTimerBehavior({
            durationMs: 30000,
            mode: 'complete-block'
        });
        const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });

        // Pre-seed round memory
        block.pushMemory(new MemoryLocation('round', [{
            type: MetricType.CurrentRound, image: '', origin: 'runtime' as any,
            value: { current: 1, total: 3 },
            current: 1, total: 3
        } as any]));

        harness.push(block);
        harness.mount();

        // Trigger expiry
        (behavior as any).handleExpiry(block.behaviorContext!, 'complete-block');

        expect(block.recordings.updateMemory.filter(u => u.tag === 'round')).toHaveLength(0);
        expect(block.recordings.markComplete).toHaveLength(1);
        expect(block.recordings.markComplete[0].reason).toBe('timer-expired');
    });
});

describe('CountdownTimerBehavior - Leaf Node Rest', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    it('pushes rest block onNext for leaf node with remaining time', () => {
        const restBlockFactory = vi.fn((durationMs: number, label: string) => [{ type: 'push-block', payload: { durationMs, label } } as any]);
        harness = new BehaviorTestHarness().withClock(new Date(1000));
        const behavior = new CountdownTimerBehavior({
            durationMs: 60000,
            restBlockFactory
        });
        const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });

        // Initialize memory with timer: 40s elapsed (20s remaining)
        const startTime = 1000;
        block.pushMemory(new MemoryLocation('time', [{
            type: 0 as any, image: '', origin: 'runtime' as any,
            value: {
                spans: [new TimeSpan(startTime)],
                direction: 'down',
                durationMs: 60000,
                label: 'Test'
            }
        }]));

        harness.push(block);
        harness.mount();

        // Advance clock to 41s (40s elapsed, 20s remaining)
        harness.advanceClock(40000);
        // Use block.next() directly — restBlockFactory returns plain objects, not IRuntimeAction
        const actions = block.next(harness.runtime);

        expect(restBlockFactory).toHaveBeenCalledWith(20000, 'Rest');
        expect(actions).toEqual([{ type: 'push-block', payload: { durationMs: 20000, label: 'Rest' } }]);
    });

    it('does not push rest block if it is a parent node', () => {
        const restBlockFactory = vi.fn();
        harness = new BehaviorTestHarness().withClock(new Date(1000));

        // Need to import ChildSelectionBehavior to simulate parent node
        const { ChildSelectionBehavior } = require('../ChildSelectionBehavior');
        const childSelection = new ChildSelectionBehavior({ childGroups: [[1]] });

        const behavior = new CountdownTimerBehavior({
            durationMs: 60000,
            restBlockFactory
        });
        const block = new MockBlock('test-block', [behavior, childSelection], { label: 'Test Block' });

        // Initialize timer memory
        const startTime = 1000;
        block.pushMemory(new MemoryLocation('time', [{
            type: 0 as any, image: '', origin: 'runtime' as any,
            value: {
                spans: [new TimeSpan(startTime)],
                direction: 'down',
                durationMs: 60000,
                label: 'Test'
            }
        }]));

        harness.push(block);
        // Mount directly — ChildSelectionBehavior returns compile-child-block actions
        // that need runtime.script which isn't available in BehaviorTestHarness
        block.mount(harness.runtime);

        harness.advanceClock(40000);
        // Use block.next() directly to avoid action execution
        const actions = block.next(harness.runtime);

        expect(restBlockFactory).not.toHaveBeenCalled();
    });

    it('does not push rest block if less than 1s remaining', () => {
        const restBlockFactory = vi.fn();
        harness = new BehaviorTestHarness().withClock(new Date(1000));
        const behavior = new CountdownTimerBehavior({
            durationMs: 60000,
            restBlockFactory
        });
        const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });

        // Initialize timer memory
        const startTime = 1000;
        block.pushMemory(new MemoryLocation('time', [{
            type: 0 as any, image: '', origin: 'runtime' as any,
            value: {
                spans: [new TimeSpan(startTime)],
                direction: 'down',
                durationMs: 60000,
                label: 'Test'
            }
        }]));

        harness.push(block);
        harness.mount();

        // Advance to 59.5s elapsed (0.5s remaining)
        harness.advanceClock(59500);
        const actions = harness.next();

        expect(restBlockFactory).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });
});
