
import { describe, it, expect, beforeEach } from 'bun:test';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../../../src/runtime/RuntimeBlock';
import { TimerInitBehavior, TimerTickBehavior, TimerPauseBehavior } from '../../../src/runtime/behaviors';
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
        it('should create a block with timer behaviors', () => {
            const timerInit = new TimerInitBehavior({ direction: 'up', label: 'Timer' });
            const timerTick = new TimerTickBehavior();
            const block = new RuntimeBlock(runtime, [1], [timerInit, timerTick], 'Timer');
            block.mount(runtime);

            // Block should have the behaviors attached
            expect(block.getBehavior(TimerInitBehavior)).toBeDefined();
            expect(block.getBehavior(TimerTickBehavior)).toBeDefined();
        });

        it('should return empty array for non-existent block keys', () => {
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

    describe('Timer Memory Initialization', () => {
        it('should initialize timer memory on mount', () => {
            const timerInit = new TimerInitBehavior({ direction: 'up', label: 'Timer' });
            const timerTick = new TimerTickBehavior();
            const block = new RuntimeBlock(runtime, [1], [timerInit, timerTick], 'Timer');
            
            block.mount(runtime);
            
            // Timer state is signaled by memory, not event
            const timerMemory = block.getMemory('timer');
            expect(timerMemory).toBeDefined();
            expect(timerMemory?.value.direction).toBe('up');
        });
    });

    describe('RuntimeProvider Context', () => {
        it('should provide runtime memory access', () => {
            const timerInit = new TimerInitBehavior({ direction: 'up', label: 'Timer' });
            const timerTick = new TimerTickBehavior();
            const block = new RuntimeBlock(runtime, [1], [timerInit, timerTick], 'Timer');
            block.mount(runtime);

            // Verify that runtime memory can be accessed
            const refs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: null,
                visibility: 'public'
            });

            // Memory search should work
            expect(refs).toBeDefined();
        });
    });
});
