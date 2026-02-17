import { describe, expect, it, vi, beforeEach } from 'bun:test';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IEventBus } from '../contracts/events/IEventBus';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { MemoryLocation } from '../memory/MemoryLocation';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

describe('RuntimeBlock Lifecycle', () => {
    let runtime: IScriptRuntime;
    let eventBus: IEventBus;
    let clock: IRuntimeClock;
    let block: RuntimeBlock;
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

        block = new RuntimeBlock(runtime, [], [behavior]);
    });

    describe('mount', () => {
        it('should not register per-block event handlers (handled at runtime level)', () => {
            block.mount(runtime);

            // Per-block event handlers were removed — event routing is handled by ScriptRuntime
            expect(eventBus.register).not.toHaveBeenCalled();
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
            const timerLoc = new MemoryLocation('time', [{
                fragmentType: FragmentType.Duration,
                type: 'duration',
                image: '',
                origin: 'runtime',
                value: { direction: 'up', spans: [] },
            } as ICodeFragment]);
            const disposeSpy = vi.spyOn(timerLoc, 'dispose');
            block.pushMemory(timerLoc);

            block.unmount(runtime);
            expect(disposeSpy).toHaveBeenCalled();
            expect(block.hasMemory('time')).toBe(false);
        });

        it('should handle unmount without event handler cleanup (no per-block handlers)', () => {
            block.mount(runtime);
            block.unmount(runtime);

            // No per-block event handlers to unsubscribe — event routing is at runtime level
            expect(eventBus.register).not.toHaveBeenCalled();
        });
    });
});
