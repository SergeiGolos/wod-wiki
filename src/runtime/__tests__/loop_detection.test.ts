import { describe, it, expect } from 'bun:test';
import { RuntimeFactory } from '../compiler/RuntimeFactory';
import { createTestableRuntime } from '../../testing/testable/TestableRuntime';
import { WodBlock } from '../../markdown-editor/types';
import { CodeStatement } from '../../core/models/CodeStatement';
import { JitCompiler } from '../compiler/JitCompiler';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

describe('Loop Detection', () => {
    it('should not infinite loop on repeated timer:complete events', () => {
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

        let compileCount = 0;
        const mockCompiler = {
            compile: () => {
                compileCount++;
                if (compileCount > 10) {
                    throw new Error('Too many compiles - possible infinite loop!');
                }
                return {
                    key: { toString: () => `mock-child-${compileCount}` },
                    label: `mock-child-${compileCount}`,
                    sourceIds: [],
                    mount: () => [],
                    next: () => [],
                    unmount: () => [],
                    dispose: () => {},
                    getBehavior: () => undefined
                } as any;
            }
        } as JitCompiler;

        const factory = new RuntimeFactory(mockCompiler);
        const runtime = factory.createRuntime(block);
        if (!runtime) throw new Error('Failed to create runtime');

        const testRuntime = createTestableRuntime(runtime);

        // Start workout
        testRuntime.simulateNext();

        // Pop the child
        testRuntime.popBlock();

        // Now we should be at final idle
        console.log('After child pop:', testRuntime.stack.blocks.map(b => b.label));

        // Simulate multiple timer:complete events (this should not cause infinite loop)
        for (let i = 0; i < 5; i++) {
            console.log(`timer:complete iteration ${i}`);
            testRuntime.simulateEvent('timer:complete', { blockId: 'idle-end' });
            console.log('Stack:', testRuntime.stack.blocks.map(b => b.label));
            if (testRuntime.stack.blocks.length === 0) break;
        }

        expect(compileCount).toBeLessThan(10);
    });
});
