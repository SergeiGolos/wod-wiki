import { describe, expect, it, vi } from 'bun:test';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { MemoryLocation } from '../memory/MemoryLocation';
import { IMetric, MetricType } from '../../core/models/Metric';
import { CurrentRoundMetric } from '../compiler/metrics/CurrentRoundMetric';

describe('RuntimeBlock Memory Methods', () => {
    const runtime = {} as IScriptRuntime;

    const createBlock = () => new RuntimeBlock(runtime);

    function createFragment(tag: string, value: unknown): IMetric {
        return {
            type: MetricType.Duration,
            image: '',
            origin: 'runtime',
            value,
        } as IMetric;
    }

    // ====================================================================
    // List-based Memory API
    // ====================================================================

    describe('pushMemory', () => {
        it('should add a memory location', () => {
            const block = createBlock();
            const loc = new MemoryLocation('time', [createFragment('timer', { direction: 'up' })]);

            block.pushMemory(loc);

            expect(block.getAllMemory()).toHaveLength(1);
        });

        it('should allow multiple locations with the same tag', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('time', [createFragment('timer', { direction: 'up' })]));
            block.pushMemory(new MemoryLocation('time', [createFragment('timer', { direction: 'down' })]));

            expect(block.getMemoryByTag('time')).toHaveLength(2);
        });
    });

    describe('getMemoryByTag', () => {
        it('should return empty array when no matching locations', () => {
            const block = createBlock();
            expect(block.getMemoryByTag('time')).toEqual([]);
        });

        it('should return matching locations by tag', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('time', [createFragment('timer', { direction: 'up' })]));
            block.pushMemory(new MemoryLocation('round', [createFragment('round', { current: 1 })]));

            const timers = block.getMemoryByTag('time');
            expect(timers).toHaveLength(1);
            expect(timers[0].metrics[0].value).toEqual({ direction: 'up' });
        });
    });

    describe('getAllMemory', () => {
        it('should return empty array when no memory', () => {
            const block = createBlock();
            expect(block.getAllMemory()).toEqual([]);
        });

        it('should return all locations in insertion order', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('time', []));
            block.pushMemory(new MemoryLocation('round', []));
            block.pushMemory(new MemoryLocation('display', []));

            const all = block.getAllMemory();
            expect(all).toHaveLength(3);
            expect(all.map(l => l.tag)).toEqual(['time', 'round', 'display']);
        });
    });

    // ====================================================================
    // Memory existence check (modern API)
    // ====================================================================

    describe('hasTag', () => {
        it('should have no tag when no memory is set', () => {
            const block = createBlock();
            expect(block.getMemoryByTag('time')).toHaveLength(0);
            expect(block.getMemoryByTag('round')).toHaveLength(0);
        });

        it('should find tag after memory is pushed', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('time', [createFragment('timer', { direction: 'up' })]));

            expect(block.getMemoryByTag('time')).toHaveLength(1);
            expect(block.getMemoryByTag('round')).toHaveLength(0);
        });
    });

    describe('getMemoryByTag value access', () => {
        it('should return empty array when no memory is set', () => {
            const block = createBlock();
            expect(block.getMemoryByTag('time')[0]).toBeUndefined();
        });

        it('should read first metrics value', () => {
            const block = createBlock();
            const timerState = { direction: 'down', durationMs: 60000, label: 'Countdown', spans: [] };
            block.pushMemory(new MemoryLocation('time', [createFragment('timer', timerState)]));

            const loc = block.getMemoryByTag('time')[0];
            expect(loc).toBeDefined();
            expect(loc?.metrics[0]?.value).toEqual(timerState);
        });

        it('should preserve type safety across multiple memory types', () => {
            const block = createBlock();
            const timerState = { direction: 'up', spans: [], label: 'Test' };
            block.pushMemory(new MemoryLocation('time', [createFragment('timer', timerState)]));
            block.pushMemory(new MemoryLocation('round', [new CurrentRoundMetric(1, 5, 'block', new Date())]));

            const timerLoc = block.getMemoryByTag('time')[0];
            const roundFrag = block.getMemoryByTag('round')[0]?.metrics[0] as any;

            expect(timerLoc?.metrics[0]?.value).toMatchObject({ spans: [] });
            expect(roundFrag?.current).toBe(1);
            expect(roundFrag?.total).toBe(5);
        });
    });

    describe('IMemoryLocation.update (replaces setMemoryValue)', () => {
        it('should create new location when none exists', () => {
            const block = createBlock();
            const loc = new MemoryLocation('time', [createFragment('timer', { direction: 'up', spans: [], label: 'Test' })]);
            block.pushMemory(loc);

            expect(block.getMemoryByTag('time')).toHaveLength(1);
            expect((block.getMemoryByTag('time')[0]?.metrics[0]?.value as any)?.direction).toBe('up');
        });

        it('should update existing location value', () => {
            const block = createBlock();
            const frag = createFragment('timer', { direction: 'up', label: 'First' });
            const loc = new MemoryLocation('time', [frag]);
            block.pushMemory(loc);

            loc.update([{ ...frag, value: { direction: 'down', label: 'Second' } }]);

            expect((block.getMemoryByTag('time')[0]?.metrics[0]?.value as any)?.label).toBe('Second');
        });

        it('should allow updating memory without error', () => {
            const block = createBlock();
            const frag = createFragment('timer', { direction: 'up', label: 'First' });
            const loc = new MemoryLocation('time', [frag]);
            block.pushMemory(loc);
            loc.update([{ ...frag, value: { direction: 'down', label: 'Second' } }]);
            loc.update([{ ...frag, value: { direction: 'up', label: 'Third' } }]);

            expect((block.getMemoryByTag('time')[0]?.metrics[0]?.value as any)?.label).toBe('Third');
        });
    });

    // ====================================================================
    // Dispose
    // ====================================================================

    describe('dispose', () => {
        it('should call onDispose on behaviors', () => {
            const behavior = { onDispose: vi.fn() };
            const block = new RuntimeBlock(runtime, [], [behavior as any]);
            block.dispose(runtime);
            expect(behavior.onDispose).toHaveBeenCalled();
        });

        it('should clear all memory locations on dispose', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('time', [createFragment('timer', { direction: 'up' })]));

            block.dispose(runtime);

            // Memory IS cleared by dispose in the modern architecture
            expect(block.getMemoryByTag('time')).toHaveLength(0);
        });

        it('should allow multiple dispose calls safely', () => {
            const block = createBlock();
            block.pushMemory(new MemoryLocation('time', [createFragment('timer', { direction: 'up' })]));

            expect(() => {
                block.dispose(runtime);
                block.dispose(runtime);
            }).not.toThrow();
        });
    });
});
