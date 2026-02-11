import { describe, expect, it, vi } from 'bun:test';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { MemoryLocation, MemoryTag } from '../memory/MemoryLocation';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

describe('RuntimeBlock Memory Methods', () => {
    const runtime = {} as IScriptRuntime;

    const createBlock = () => new RuntimeBlock(runtime);

    function createFragment(tag: string, value: unknown): ICodeFragment {
        return {
            fragmentType: FragmentType.Timer,
            type: tag,
            image: '',
            origin: 'runtime',
            value,
        } as ICodeFragment;
    }

    // ====================================================================
    // List-based Memory API
    // ====================================================================

    describe('pushMemory', () => {
        it('should add a memory location', () => {
            const block = createBlock();
            const loc = new MemoryLocation('timer', [createFragment('timer', { direction: 'up' })]);

            block.pushMemory(loc);

            expect(block.getAllMemory()).toHaveLength(1);
        });

        it('should allow multiple locations with the same tag', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('timer', [createFragment('timer', { direction: 'up' })]));
            block.pushMemory(new MemoryLocation('timer', [createFragment('timer', { direction: 'down' })]));

            expect(block.getMemoryByTag('timer')).toHaveLength(2);
        });
    });

    describe('getMemoryByTag', () => {
        it('should return empty array when no matching locations', () => {
            const block = createBlock();
            expect(block.getMemoryByTag('timer')).toEqual([]);
        });

        it('should return matching locations by tag', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('timer', [createFragment('timer', { direction: 'up' })]));
            block.pushMemory(new MemoryLocation('round', [createFragment('round', { current: 1 })]));

            const timers = block.getMemoryByTag('timer');
            expect(timers).toHaveLength(1);
            expect(timers[0].fragments[0].value).toEqual({ direction: 'up' });
        });
    });

    describe('getAllMemory', () => {
        it('should return empty array when no memory', () => {
            const block = createBlock();
            expect(block.getAllMemory()).toEqual([]);
        });

        it('should return all locations in insertion order', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('timer', []));
            block.pushMemory(new MemoryLocation('round', []));
            block.pushMemory(new MemoryLocation('display', []));

            const all = block.getAllMemory();
            expect(all).toHaveLength(3);
            expect(all.map(l => l.tag)).toEqual(['timer', 'round', 'display']);
        });
    });

    // ====================================================================
    // Backward-Compatible Shims
    // ====================================================================

    describe('hasMemory (shim)', () => {
        it('should return false when no memory is set', () => {
            const block = createBlock();
            expect(block.hasMemory('timer')).toBe(false);
            expect(block.hasMemory('round')).toBe(false);
        });

        it('should return true after memory is pushed', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('timer', [createFragment('timer', { direction: 'up' })]));

            expect(block.hasMemory('timer')).toBe(true);
            expect(block.hasMemory('round')).toBe(false);
        });
    });

    describe('getMemory (shim)', () => {
        it('should return undefined when no memory is set', () => {
            const block = createBlock();
            expect(block.getMemory('timer')).toBeUndefined();
        });

        it('should return a shim that reads first fragment value', () => {
            const block = createBlock();
            const timerState = { direction: 'down', durationMs: 60000, label: 'Countdown', spans: [] };
            block.pushMemory(new MemoryLocation('timer', [createFragment('timer', timerState)]));

            const shim = block.getMemory('timer');
            expect(shim).toBeDefined();
            expect(shim?.value).toEqual(timerState);
        });

        it('should preserve type safety across multiple memory types', () => {
            const block = createBlock();
            const timerState = { direction: 'up', spans: [], label: 'Test' };
            const roundState = { current: 1, total: 5 };
            block.pushMemory(new MemoryLocation('timer', [createFragment('timer', timerState)]));
            block.pushMemory(new MemoryLocation('round', [createFragment('round', roundState)]));

            const timer = block.getMemory('timer');
            const round = block.getMemory('round');

            expect(timer?.value.spans).toBeDefined();
            expect(round?.value.current).toBe(1);
            expect(round?.value.total).toBe(5);
        });
    });

    describe('setMemoryValue (shim)', () => {
        it('should create new location when none exists', () => {
            const block = createBlock();
            block.setMemoryValue('timer', { direction: 'up', spans: [], label: 'Test' } as any);

            expect(block.hasMemory('timer')).toBe(true);
            expect(block.getMemory('timer')?.value.direction).toBe('up');
        });

        it('should update existing location value', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('timer', [createFragment('timer', { direction: 'up', label: 'First' })]));

            block.setMemoryValue('timer', { direction: 'down', label: 'Second' } as any);

            expect(block.getMemory('timer')?.value.label).toBe('Second');
        });

        it('should allow overwriting memory without error', () => {
            const block = createBlock();
            block.setMemoryValue('timer', { direction: 'up', label: 'First' } as any);
            block.setMemoryValue('timer', { direction: 'down', label: 'Second' } as any);

            expect(block.getMemory('timer')?.value.label).toBe('Second');
        });
    });

    // ====================================================================
    // Dispose
    // ====================================================================

    describe('dispose', () => {
        it('should call onDispose on behaviors', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('timer', [createFragment('timer', { direction: 'up' })]));

            block.dispose(runtime);

            // Memory is NOT cleared by dispose - only by unmount
            expect(block.hasMemory('timer')).toBe(true);
        });

        it('should allow multiple dispose calls safely', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('timer', [createFragment('timer', { direction: 'up' })]));

            expect(() => {
                block.dispose(runtime);
                block.dispose(runtime);
            }).not.toThrow();
        });
    });
});
