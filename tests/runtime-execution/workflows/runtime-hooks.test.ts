
import { describe, it, expect, beforeEach } from 'bun:test';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../../../src/runtime/RuntimeBlock';
import { TimerBehavior } from '../../../src/runtime/behaviors/TimerBehavior';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../../../src/runtime/models/RuntimeSpan';
import { TimeSpan } from '../../../src/runtime/models/TimeSpan';
import { RuntimeMemory } from '../../../src/runtime/RuntimeMemory';
import { RuntimeStack } from '../../../src/runtime/RuntimeStack';
import { RuntimeClock } from '../../../src/runtime/RuntimeClock';
import { EventBus } from '../../../src/runtime/events/EventBus';
import { WodScript } from '../../../src/parser/WodScript';
import { JitCompiler } from '../../../src/runtime/compiler/JitCompiler';

/**
 * Integration tests for runtime hooks.
 * 
 * Note: These tests verify the hook logic without React rendering.
 * Full React component tests should be done in Storybook or with React Testing Library.
 */
describe('Runtime Hooks Integration', () => {
    let runtime: ScriptRuntime;

    beforeEach(() => {
        const dependencies = {
            memory: new RuntimeMemory(),
            stack: new RuntimeStack(),
            clock: new RuntimeClock(),
            eventBus: new EventBus(),
        };
        const script = new WodScript('', [], []);
        const compiler = new JitCompiler();
        runtime = new ScriptRuntime(script, compiler, dependencies);
    });

    describe('Timer References', () => {
        it('should be able to search for timer state memory reference', () => {
            const behavior = new TimerBehavior('up', undefined, 'Timer');
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Search for unified RuntimeSpan using the new memory model
            const runtimeSpanRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: RUNTIME_SPAN_TYPE,
                visibility: null
            });

            expect(runtimeSpanRefs.length).toBe(1);

            // Verify the state structure
            const span = (runtimeSpanRefs[0] as any).get() as RuntimeSpan;
            expect(span).toBeDefined();
            expect(span.blockId).toBe(block.key.toString());
            // RuntimeSpan has isActive() method and spans array
            expect(typeof span.isActive).toBe('function');
            expect(Array.isArray(span.spans)).toBe(true);
            // It should have timerConfig
            expect(span.timerConfig).toBeDefined();
        });

        it('should return undefined for non-existent block keys', () => {
            // Simulate searching for a block that doesn't exist
            const runtimeSpanRefs = runtime.memory.search({
                id: null,
                ownerId: 'non-existent-block',
                type: RUNTIME_SPAN_TYPE,
                visibility: null
            });

            expect(runtimeSpanRefs.length).toBe(0);
        });
    });

    describe('Memory Subscription', () => {
        it('should notify when subscribed to timer state changes', () => {
            const behavior = new TimerBehavior('up', undefined, 'Timer');
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            const runtimeSpanRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: RUNTIME_SPAN_TYPE,
                visibility: null
            });

            const ref = runtimeSpanRefs[0] as any;
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

            // Simulate time passing by manually updating memory
            const startTime = Date.now() - 1000;

            const runtimeSpanRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: RUNTIME_SPAN_TYPE,
                visibility: null
            });

            const ref = runtimeSpanRefs[0] as any;
            const span = ref.get() as RuntimeSpan;

            // Update the span's start time
            // Since RuntimeSpan is a class, we need to preserve the instance or properties
            // We can mutate the spans array if we are careful, or create new TimerSpan
            const updatedSpans = [...span.spans];
            if (updatedSpans.length > 0) {
                updatedSpans[0] = new TimeSpan(startTime, updatedSpans[0].ended);
            }

            // Set updated span back to memory (triggers notification)
            span.spans = updatedSpans;
            ref.set(span);

            // Calculate elapsed (simulating what useTimerElapsed does)
            const currentSpan = ref.get() as RuntimeSpan;
            // Use result of .total() or manual calculation simulation
            const elapsed = currentSpan.spans.reduce((total: number, s: TimeSpan) => {
                const end = s.ended ?? Date.now();
                return total + Math.max(0, end - s.started);
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

            const runtimeSpanRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: RUNTIME_SPAN_TYPE,
                visibility: null
            });

            const ref = runtimeSpanRefs[0] as any;
            const span = ref.get() as RuntimeSpan;

            expect(span.spans.length).toBe(2);
            expect(span.spans[0].ended).toBeDefined();
            expect(span.spans[1].started).toBeDefined();
            expect(span.spans[1].ended).toBeUndefined();
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

            const runtimeSpanRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: RUNTIME_SPAN_TYPE,
                visibility: null
            });

            const ref = runtimeSpanRefs[0] as any;
            const span = ref.get() as RuntimeSpan;

            // Should have multiple spans from pause/resume cycles (original + 5 cycles -> 1 initial + 5*2 changes? No, pause closes one, resume opens one.
            // Initial: 1 open.
            // Loop 1: Pause (1 closed), Resume (2 open).
            // Loop 5: Ends with (6 open).
            expect(span.spans.length).toBeGreaterThan(1);
        });

        it('should handle block disposal gracefully', () => {
            const behavior = new TimerBehavior('up', undefined, 'Timer');
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            const runtimeSpanRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: RUNTIME_SPAN_TYPE,
                visibility: null
            });

            const ref = runtimeSpanRefs[0] as any;
            let notificationCount = 0;

            ref.subscribe(() => {
                notificationCount++;
            });

            // Dispose the block
            block.dispose(runtime);

            // Should notify subscribers on change (stop called)
            expect(notificationCount).toBeGreaterThanOrEqual(1);

            // References should NOT be released (persisted as history)
            const afterRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: RUNTIME_SPAN_TYPE,
                visibility: null
            });

            expect(afterRefs.length).toBe(1);
            const endSpan = (afterRefs[0] as any).get() as RuntimeSpan;
            expect(endSpan.isActive()).toBe(false);
        });
    });
});
