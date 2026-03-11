import { describe, expect, it, vi } from 'bun:test';
import { CountdownTimerBehavior } from '../CountdownTimerBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IMetric, MetricType } from '../../../core/models/Metric';
import { MemoryTag, MemoryLocation } from '../../memory/MemoryLocation';
import { TimerState, RoundState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryLocations = new Map<MemoryTag, MemoryLocation>();
    const behaviors: any[] = [];

    const ctx = {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            behaviors: behaviors,
            getBehavior: (type: any) => behaviors.find(b => b instanceof type),
            markComplete: vi.fn(),
        },
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(() => vi.fn()),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        // setMemory is used in tests to seed data — store as MemoryLocation
        setMemory: vi.fn((tag: MemoryTag, value: any) => {
            // For 'round': metrics is the roundState itself (cast pattern)
            // For 'time': metric has .value = timerState
            const frag: IMetric = tag === 'round'
                ? { ...value, type: MetricType.CurrentRound, image: '', origin: 'runtime' as any } as any
                : { type: 0 as any, image: '', origin: 'runtime' as any, value };
            const existing = memoryLocations.get(tag);
            if (existing) {
                existing.update([frag]);
            } else {
                memoryLocations.set(tag, new MemoryLocation(tag, [frag]));
            }
        }),
        getMemory: vi.fn((tag: MemoryTag) => {
            const loc = memoryLocations.get(tag);
            if (!loc || loc.metrics.length === 0) return undefined;
            return tag === 'round' ? loc.metrics[0] : loc.metrics[0].value;
        }),
        getMemoryByTag: vi.fn((tag: MemoryTag) => {
            const loc = memoryLocations.get(tag);
            return loc ? [loc] : [];
        }),
        pushMemory: vi.fn((tag: MemoryTag, metrics: IMetric[]) => {
            const loc = new MemoryLocation(tag, metrics);
            memoryLocations.set(tag, loc);
            return loc;
        }),
        updateMemory: vi.fn((tag: MemoryTag, metrics: IMetric[]) => {
            const loc = memoryLocations.get(tag);
            if (loc) {
                loc.update(metrics);
            } else {
                memoryLocations.set(tag, new MemoryLocation(tag, metrics));
            }
        }),
    } as unknown as IBehaviorContext;

    return { ...ctx, ...overrides } as any;
}

describe('CountdownTimerBehavior - Round Increment', () => {
    it('increments round in reset-interval mode when timer expires', () => {
        const ctx = createMockContext();
        const behavior = new CountdownTimerBehavior({ 
            durationMs: 30000, 
            mode: 'reset-interval' 
        });

        // Initialize memory
        ctx.setMemory('round', { current: 1, total: 3 });
        ctx.setMemory('time', {
            spans: [new TimeSpan(1000)],
            direction: 'down',
            durationMs: 30000,
            label: 'Test'
        });

        // Trigger expiry (private method access for test)
        (behavior as any).handleExpiry(ctx, 'reset-interval');

        expect(ctx.updateMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
            expect.objectContaining({
                type: MetricType.CurrentRound,
                value: 2
            })
        ]));
    });

    it('does not increment round in complete-block mode', () => {
        const ctx = createMockContext();
        const behavior = new CountdownTimerBehavior({ 
            durationMs: 30000, 
            mode: 'complete-block' 
        });

        // Initialize memory
        ctx.setMemory('round', { current: 1, total: 3 });
        
        // Trigger expiry
        (behavior as any).handleExpiry(ctx, 'complete-block');

        expect(ctx.updateMemory).not.toHaveBeenCalled();
        expect(ctx.markComplete).toHaveBeenCalledWith('timer-expired');
    });
});

describe('CountdownTimerBehavior - Leaf Node Rest', () => {
    it('pushes rest block onNext for leaf node with remaining time', () => {
        const restBlockFactory = vi.fn((durationMs, label) => [{ type: 'push-block', payload: { durationMs, label } } as any]);
        const ctx = createMockContext();
        const behavior = new CountdownTimerBehavior({ 
            durationMs: 60000,
            restBlockFactory
        });

        // Simulate leaf node (no ChildSelectionBehavior in behaviors)
        (ctx.block.behaviors as any).length = 0;

        // Initialize memory with 40s elapsed (20s remaining)
        const startTime = 1000;
        const now = 41000;
        (ctx.clock as any).now = new Date(now);
        ctx.setMemory('time', {
            spans: [new TimeSpan(startTime)],
            direction: 'down',
            durationMs: 60000,
            label: 'Test'
        });

        const actions = behavior.onNext(ctx);

        expect(restBlockFactory).toHaveBeenCalledWith(20000, 'Rest');
        expect(actions).toEqual([{ type: 'push-block', payload: { durationMs: 20000, label: 'Rest' } }]);
    });

    it('does not push rest block if it is a parent node', () => {
        const restBlockFactory = vi.fn();
        const ctx = createMockContext();
        const behavior = new CountdownTimerBehavior({ 
            durationMs: 60000,
            restBlockFactory
        });

        // Simulate parent node (has ChildSelectionBehavior)
        class ChildSelectionBehavior {}
        const childSelection = new ChildSelectionBehavior();
        (ctx.block.behaviors as any).push(childSelection);

        // Initialize memory with 40s elapsed
        const startTime = 1000;
        const now = 41000;
        (ctx.clock as any).now = new Date(now);
        ctx.setMemory('time', {
            spans: [new TimeSpan(startTime)],
            direction: 'down',
            durationMs: 60000,
            label: 'Test'
        });

        const actions = behavior.onNext(ctx);

        expect(restBlockFactory).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });

    it('does not push rest block if less than 1s remaining', () => {
        const restBlockFactory = vi.fn();
        const ctx = createMockContext();
        const behavior = new CountdownTimerBehavior({ 
            durationMs: 60000,
            restBlockFactory
        });

        // Simulate leaf node
        (ctx.block.behaviors as any).length = 0;

        // Initialize memory with 59.5s elapsed (0.5s remaining)
        const startTime = 1000;
        const now = 60500;
        (ctx.clock as any).now = new Date(now);
        ctx.setMemory('time', {
            spans: [new TimeSpan(startTime)],
            direction: 'down',
            durationMs: 60000,
            label: 'Test'
        });

        const actions = behavior.onNext(ctx);

        expect(restBlockFactory).not.toHaveBeenCalled();
        expect(actions).toEqual([]);
    });
});
