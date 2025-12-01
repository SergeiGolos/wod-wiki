import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../../../src/runtime/RuntimeBlock';
import { TimerBehavior } from '../../../src/runtime/behaviors/TimerBehavior';
import { MemoryTypeEnum } from '../../../src/runtime/MemoryTypeEnum';
import { TimerState } from '../../../src/runtime/models/MemoryModels';

/**
 * Integration tests for runtime hooks.
 * 
 * Note: These tests verify the hook logic without React rendering.
 * Full React component tests should be done in Storybook or with React Testing Library.
 */
describe('Runtime Hooks Integration', () => {
    let runtime: ScriptRuntime;

    beforeEach(() => {
        runtime = new ScriptRuntime();
    });

    describe('Timer References', () => {
        it('should be able to search for timer state memory reference', () => {
            const behavior = new TimerBehavior('up', undefined, 'Timer');
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Search for unified TimerState using the new memory model
            // The 'type' parameter is the timer prefix + block key
            const timerStateRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: `${MemoryTypeEnum.TIMER_PREFIX}${block.key.toString()}`,
                visibility: null
            });

            expect(timerStateRefs.length).toBe(1);
            
            // Verify the state structure
            const state = (timerStateRefs[0] as any).get() as TimerState;
            expect(state).toBeDefined();
            expect(state.blockId).toBe(block.key.toString());
            expect(state.isRunning).toBeDefined();
            expect(Array.isArray(state.spans)).toBe(true);
        });

        it('should return undefined for non-existent block keys', () => {
            // Simulate searching for a block that doesn't exist
            const timerStateRefs = runtime.memory.search({
                id: null,
                ownerId: 'non-existent-block',
                type: `${MemoryTypeEnum.TIMER_PREFIX}non-existent-block`,
                visibility: null
            });

            expect(timerStateRefs.length).toBe(0);
        });
    });

    describe('Memory Subscription', () => {
        it('should notify when subscribed to timer state changes', () => {
            const behavior = new TimerBehavior('up', undefined, 'Timer');
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            const timerStateRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: `${MemoryTypeEnum.TIMER_PREFIX}${block.key.toString()}`,
                visibility: null
            });

            const ref = timerStateRefs[0] as any;
            let notificationCount = 0;

            // Simulate subscription
            const unsubscribe = ref.subscribe(() => {
                notificationCount++;
            });

            behavior.pause();
            expect(notificationCount).toBe(1);

            behavior.resume();
            expect(notificationCount).toBe(2);

            unsubscribe();
        });
    });

    describe('Timer Elapsed Calculation', () => {
        it('should calculate elapsed time correctly', () => {
            const behavior = new TimerBehavior('up', undefined, 'Timer');
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Simulate time passing
            const startTime = Date.now() - 1000;
            
            const timerStateRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: `${MemoryTypeEnum.TIMER_PREFIX}${block.key.toString()}`,
                visibility: null
            });

            const ref = timerStateRefs[0] as any;
            const state = ref.get() as TimerState;
            
            // Update the span's start time
            const updatedSpans = [...state.spans];
            updatedSpans[0] = { ...updatedSpans[0], start: startTime };
            ref.set({ ...state, spans: updatedSpans });

            // Calculate elapsed (simulating what useTimerElapsed does)
            const currentState = ref.get() as TimerState;
            const elapsed = currentState.spans.reduce((total: number, span) => {
                if (!span.start) return total;
                // TimerSpan uses number timestamps (not Date objects)
                const stop = span.stop || Date.now();
                const start = span.start;
                return total + (stop - start);
            }, 0);

            expect(elapsed).toBeGreaterThanOrEqual(1000);
        });

        it('should handle multiple spans correctly', () => {
            const behavior = new TimerBehavior('up', undefined, 'Timer');
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Simulate pause/resume cycle
            behavior.pause();
            behavior.resume();

            const timerStateRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: `${MemoryTypeEnum.TIMER_PREFIX}${block.key.toString()}`,
                visibility: null
            });

            const ref = timerStateRefs[0] as any;
            const state = ref.get() as TimerState;

            expect(state.spans.length).toBe(2);
            expect(state.spans[0].stop).toBeDefined();
            expect(state.spans[1].start).toBeDefined();
            expect(state.spans[1].stop).toBeUndefined();
        });
    });

    describe('RuntimeProvider Context', () => {
        it('should provide runtime memory access', () => {
            const behavior = new TimerBehavior('up', undefined, 'Timer');
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Verify that runtime memory can be accessed
            const refs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: null,
                visibility: 'public'
            });

            expect(refs.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle rapid state changes', () => {
            const behavior = new TimerBehavior('up', undefined, 'Timer');
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Rapid pause/resume
            for (let i = 0; i < 5; i++) {
                behavior.pause();
                behavior.resume();
            }

            const timerStateRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: `${MemoryTypeEnum.TIMER_PREFIX}${block.key.toString()}`,
                visibility: null
            });

            const ref = timerStateRefs[0] as any;
            const state = ref.get() as TimerState;

            // Should have multiple spans from pause/resume cycles
            expect(state.spans.length).toBeGreaterThan(1);
        });

        it.todo('should handle block disposal gracefully', () => {
            // TODO: Block disposal workflow needs review - timerRef subscription count
            const behavior = new TimerBehavior('up', undefined, 'Timer');
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            const timerStateRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: `${MemoryTypeEnum.TIMER_PREFIX}${block.key.toString()}`,
                visibility: null
            });

            const ref = timerStateRefs[0] as any;
            let notificationCount = 0;

            ref.subscribe(() => {
                notificationCount++;
            });

            // Dispose the block
            block.dispose(runtime);

            // Should notify subscribers on release
            expect(notificationCount).toBe(1);

            // References should be released
            const afterRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: `${MemoryTypeEnum.TIMER_PREFIX}${block.key.toString()}`,
                visibility: null
            });

            expect(afterRefs.length).toBe(0);
        });
    });
});
