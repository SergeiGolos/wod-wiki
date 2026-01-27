import { describe, expect, it, vi, beforeEach } from 'bun:test';
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
        } as unknown as IScriptRuntime;

        behavior = {
            onPush: vi.fn(),
            onNext: vi.fn(),
            onPop: vi.fn(),
            onDispose: vi.fn()
        };

        block = new TestableRuntimeBlock(runtime, [], [behavior]);
    });

    describe('mount', () => {
        it('should register default event handlers', () => {
            block.mount(runtime);

            // Should register 'next' and '*' handlers
            expect(eventBus.register).toHaveBeenCalledTimes(2);
            expect(eventBus.register).toHaveBeenCalledWith('next', expect.any(Object), expect.any(String));
            expect(eventBus.register).toHaveBeenCalledWith('*', expect.any(Object), expect.any(String));
        });

        it('should call behaviors.onPush', () => {
            block.mount(runtime);
            expect(behavior.onPush).toHaveBeenCalledWith(block, clock);
        });

        it('should capture startTime', () => {
            block.mount(runtime, { startTime: new Date('2024-01-01T10:00:05Z') });
            expect(block.executionTiming.startTime).toEqual(new Date('2024-01-01T10:00:05Z'));
        });
    });

    describe('next', () => {
        it('should call behaviors.onNext', () => {
            block.next(runtime);
            expect(behavior.onNext).toHaveBeenCalledWith(block, clock);
        });
    });

    describe('unmount', () => {
        it('should call behaviors.onPop', () => {
            block.unmount(runtime);
            expect(behavior.onPop).toHaveBeenCalledWith(block, clock);
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

            expect(unsubscribe).toHaveBeenCalledTimes(2);
        });
    });
});
