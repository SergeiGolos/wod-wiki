import { describe, expect, it, vi } from 'bun:test';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { TimerMemory } from '../memory/TimerMemory';
import { RoundMemory } from '../memory/RoundMemory';
import { FragmentMemory } from '../memory/FragmentMemory';
import { MemoryType, MemoryValueOf } from '../memory/MemoryTypes';
import { IMemoryEntry } from '../memory/IMemoryEntry';

/**
 * Test subclass that exposes protected setMemory for testing.
 */
class TestableRuntimeBlock extends RuntimeBlock {
    public exposeSetMemory<T extends MemoryType>(
        type: T,
        entry: IMemoryEntry<T, MemoryValueOf<T>>
    ): void {
        this.setMemory(type, entry);
    }
}

describe('RuntimeBlock Memory Methods', () => {
    const runtime = {} as IScriptRuntime;

    const createBlock = () => new TestableRuntimeBlock(runtime);

    describe('hasMemory', () => {
        it('should return false when no memory is set', () => {
            const block = createBlock();
            expect(block.hasMemory('timer')).toBe(false);
            expect(block.hasMemory('round')).toBe(false);
            expect(block.hasMemory('fragment')).toBe(false);
        });

        it('should return true after memory is set', () => {
            const block = createBlock();
            const timer = new TimerMemory({ direction: 'up', label: 'Test' });

            block.exposeSetMemory('timer', timer);

            expect(block.hasMemory('timer')).toBe(true);
            expect(block.hasMemory('round')).toBe(false);
        });
    });

    describe('getMemory', () => {
        it('should return undefined when no memory is set', () => {
            const block = createBlock();
            expect(block.getMemory('timer')).toBeUndefined();
        });

        it('should return the memory entry after it is set', () => {
            const block = createBlock();
            const timer = new TimerMemory({ direction: 'down', label: 'Countdown', durationMs: 60000 });

            block.exposeSetMemory('timer', timer);

            const retrieved = block.getMemory('timer');
            expect(retrieved).toBe(timer);
            expect(retrieved?.value.direction).toBe('down');
            expect(retrieved?.value.label).toBe('Countdown');
        });

        it('should preserve type safety', () => {
            const block = createBlock();
            const timer = new TimerMemory({ direction: 'up', label: 'Test' });
            const round = new RoundMemory(1, 5);

            block.exposeSetMemory('timer', timer);
            block.exposeSetMemory('round', round);

            // These should be type-safe access
            const timerEntry = block.getMemory('timer');
            const roundEntry = block.getMemory('round');

            expect(timerEntry?.value.spans).toBeDefined();
            expect(roundEntry?.value.current).toBe(1);
            expect(roundEntry?.value.total).toBe(5);
        });
    });

    describe('getMemoryTypes', () => {
        it('should return empty array when no memory is set', () => {
            const block = createBlock();
            expect(block.getMemoryTypes()).toEqual([]);
        });

        it('should return all set memory types', () => {
            const block = createBlock();

            block.exposeSetMemory('timer', new TimerMemory({ direction: 'up', label: 'Test' }));
            block.exposeSetMemory('round', new RoundMemory(1, 3));
            block.exposeSetMemory('fragment', new FragmentMemory());

            const types = block.getMemoryTypes();
            expect(types).toHaveLength(3);
            expect(types).toContain('timer');
            expect(types).toContain('round');
            expect(types).toContain('fragment');
        });
    });

    describe('dispose', () => {
        it('should dispose all memory entries and notify subscribers', () => {
            const block = createBlock();
            const timer = new TimerMemory({ direction: 'up', label: 'Test' });
            const listener = vi.fn();

            block.exposeSetMemory('timer', timer);
            timer.subscribe(listener);

            block.dispose(runtime);

            // Subscriber should be notified with (undefined, lastValue)
            expect(listener).toHaveBeenCalledWith(undefined, expect.any(Object));
        });

        it('should clear memory map after disposal', () => {
            const block = createBlock();
            block.exposeSetMemory('timer', new TimerMemory({ direction: 'up', label: 'Test' }));
            block.exposeSetMemory('round', new RoundMemory(1, 5));

            expect(block.getMemoryTypes()).toHaveLength(2);

            block.dispose(runtime);

            expect(block.getMemoryTypes()).toHaveLength(0);
            expect(block.hasMemory('timer')).toBe(false);
            expect(block.hasMemory('round')).toBe(false);
        });
    });

    describe('setMemory', () => {
        it('should allow overwriting memory with warning', () => {
            const block = createBlock();
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const timer1 = new TimerMemory({ direction: 'up', label: 'First' });
            const timer2 = new TimerMemory({ direction: 'down', label: 'Second' });

            block.exposeSetMemory('timer', timer1);
            block.exposeSetMemory('timer', timer2);

            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Overwriting timer memory'));
            expect(block.getMemory('timer')?.value.label).toBe('Second');

            warnSpy.mockRestore();
        });
    });
});
