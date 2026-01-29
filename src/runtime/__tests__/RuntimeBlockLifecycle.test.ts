import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IEventBus } from '../contracts/events/IEventBus';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { TimerMemory } from '../memory/TimerMemory';
import { IMemoryEntry } from '../memory/IMemoryEntry';
import { MemoryType, MemoryValueOf } from '../memory/MemoryTypes';

class TestableRuntimeBlock extends RuntimeBlock {
    public exposeSetMemory<T extends MemoryType>(
        type: T,
        entry: IMemoryEntry<T, MemoryValueOf<T>>
    ): void {
        this.setMemory(type, entry);
    }
}

describe('RuntimeBlock Lifecycle', () => {
    let runtime: IScriptRuntime;
    let eventBus: IEventBus;
    let clock: IRuntimeClock;
    let block: TestableRuntimeBlock;
    let behavior: IRuntimeBehavior;

    beforeEach(() => {
        clock = { now: new Date('2024-01-01T10:00:00Z') } as IRuntimeClock;

        eventBus = {
            register: vi.fn().mockReturnValue(vi.fn()),
            dispatch: vi.fn().mockReturnValue([]),
            on: vi.fn(),
            unregisterById: vi.fn(),
            unregisterByOwner: vi.fn()
        } as unknown as IEventBus;

        runtime = {
            clock,
            eventBus,
            stack: { count: 1 },
            addOutput: vi.fn(), // Needed by BehaviorContext
        } as unknown as IScriptRuntime;

        behavior = {
            onMount: vi.fn(),
            onNext: vi.fn(),
            onUnmount: vi.fn(),
            onDispose: vi.fn()
        };

        block = new TestableRuntimeBlock(runtime, [], [behavior]);
    });

    describe('mount', () => {
        it('should register default event handlers', () => {
            block.mount(runtime);

            // Should register 'next' handler only (event dispatcher removed)
            expect(eventBus.register).toHaveBeenCalledTimes(1);
            expect(eventBus.register).toHaveBeenCalledWith('next', expect.any(Object), expect.any(String));
        });

        it('should call behaviors.onMount with context', () => {
            block.mount(runtime);
            expect(behavior.onMount).toHaveBeenCalledWith(expect.objectContaining({
                block: block,
                clock: runtime.clock
            }));
        });

        it('should capture startTime', () => {
            block.mount(runtime, { startTime: new Date('2024-01-01T10:00:05Z') });
            expect(block.executionTiming.startTime).toEqual(new Date('2024-01-01T10:00:05Z'));
        });
    });

    describe('next', () => {
        beforeEach(() => {
            block.mount(runtime); // Ensure context exists
        });

        it('should call behaviors.onNext with context', () => {
            block.next(runtime);
            // Verify called with context (which wraps block/clock)
            expect(behavior.onNext).toHaveBeenCalledWith(expect.objectContaining({
                block: block
            }));
        });
    });

    describe('unmount', () => {
        beforeEach(() => {
            block.mount(runtime); // Ensure context exists
        });

        it('should call behaviors.onUnmount with context', () => {
            block.unmount(runtime);
            expect(behavior.onUnmount).toHaveBeenCalledWith(expect.objectContaining({
                block: block
            }));
        });

        it('should emit unmount event', () => {
            block.unmount(runtime);
            expect(eventBus.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'unmount' }),
                runtime
            );
        });

        it('should dispose memory entries', () => {
            const timer = new TimerMemory({ direction: 'up', label: 'Test' });
            const disposeSpy = vi.spyOn(timer, 'dispose');
            block.exposeSetMemory('timer', timer);

            block.unmount(runtime);
            expect(disposeSpy).toHaveBeenCalled();
            expect(block.hasMemory('timer')).toBe(false);
        });

        it('should unregister event handlers', () => {
            const unsubscribe = vi.fn();
            (eventBus.register as any).mockReturnValue(unsubscribe);

            block.mount(runtime);
            block.unmount(runtime);

            // 1 call to unsubscribe for the 'next' handler
            expect(unsubscribe).toHaveBeenCalledTimes(1);
        });
    });
});
