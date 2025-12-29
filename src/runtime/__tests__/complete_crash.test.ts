import { describe, it, expect } from 'bun:test';
import { RuntimeFactory } from '../compiler/RuntimeFactory';
import { createTestableRuntime } from '../../testing/testable/TestableRuntime';
import { WodBlock } from '../../markdown-editor/types';
import { CodeStatement } from '../../core/models/CodeStatement';
import { JitCompiler } from '../compiler/JitCompiler';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

describe('Complete Crash Debug', () => {
    it('should complete a full workout without crashing', () => {
        const statement: CodeStatement = {
            id: 1,
            type: 'movement',
            content: '10 Pushups',
            children: []
        } as any;

        const block: WodBlock = {
            id: 'test-block',
            content: '10 Pushups',
            statements: [statement]
        } as any;

        let childPushCount = 0;
        const mockCompiler = {
            compile: (statements: any[], runtime: IScriptRuntime) => {
                childPushCount++;
                console.log(`[MOCK] compile #${childPushCount}`);
                return {
                    key: { toString: () => `mock-child-${childPushCount}` },
                    label: `mock-child-${childPushCount}`,
                    sourceIds: [],
                    mount: () => { console.log(`[MOCK] mount #${childPushCount}`); return []; },
                    next: () => { console.log(`[MOCK] next #${childPushCount}`); return []; },
                    unmount: () => { console.log(`[MOCK] unmount #${childPushCount}`); return []; },
                    dispose: () => { console.log(`[MOCK] dispose #${childPushCount}`); },
                    getBehavior: () => undefined
                } as any;
            }
        } as JitCompiler;

        const factory = new RuntimeFactory(mockCompiler);
        const runtime = factory.createRuntime(block);
        if (!runtime) throw new Error('Failed to create runtime');

        const testRuntime = createTestableRuntime(runtime);
        const logStack = () => console.log('Stack:', testRuntime.stack.blocks.map(b => b.label));

        console.log('\n=== Initial ===');
        logStack();
        expect(testRuntime.stack.blocks.length).toBe(2); // Ready, Workout

        console.log('\n=== Start workout (simulateNext) ===');
        testRuntime.simulateNext();
        logStack();
        expect(testRuntime.stack.blocks.map(b => b.label)).toContain('Workout');

        console.log('\n=== Pop child (simulating completion) ===');
        const childBlock = testRuntime.stack.current;
        if (childBlock?.label.startsWith('mock-child')) {
            testRuntime.popBlock();
        }
        logStack();

        console.log('\n=== Check for final idle ===');
        let foundFinalIdle = false;
        for (let i = 0; i < 10; i++) {
            const current = testRuntime.stack.current;
            console.log(`  Check ${i}: current = ${current?.label || 'none'}`);
            if (!current) break;
            if (current.label === 'Cooldown, checkout the Analytics') {
                foundFinalIdle = true;
                break;
            }
            testRuntime.simulateTick();
        }
        logStack();
        expect(foundFinalIdle).toBe(true);

        console.log('\n=== Simulate stop (view analytics) ===');
        testRuntime.simulateEvent('stop');
        logStack();

        console.log('\n=== Final state ===');
        console.log('isComplete:', testRuntime.isComplete());
        console.log('Stack depth:', testRuntime.stack.blocks.length);
        expect(testRuntime.isComplete()).toBe(true);
        expect(testRuntime.stack.blocks.length).toBe(0);
    });

    it('should handle timer:complete event without crash', () => {
        const statement: CodeStatement = {
            id: 1,
            type: 'movement',
            content: '10 Pushups',
            children: []
        } as any;

        const block: WodBlock = {
            id: 'test-block',
            content: '10 Pushups',
            statements: [statement]
        } as any;

        const mockCompiler = {
            compile: () => ({
                key: { toString: () => 'mock-child' },
                label: 'mock-child',
                sourceIds: [],
                mount: () => [],
                next: () => [],
                unmount: () => [],
                dispose: () => {},
                getBehavior: () => undefined
            } as any)
        } as JitCompiler;

        const factory = new RuntimeFactory(mockCompiler);
        const runtime = factory.createRuntime(block);
        if (!runtime) throw new Error('Failed to create runtime');

        const testRuntime = createTestableRuntime(runtime);

        // Start workout
        testRuntime.simulateNext();

        // Simulate timer:complete for root block
        console.log('\n=== Simulating timer:complete ===');
        testRuntime.simulateEvent('timer:complete', { blockId: 'root' });
        console.log('Stack after timer:complete:', testRuntime.stack.blocks.map(b => b.label));

        // Should not crash
        expect(true).toBe(true);
    });
});
