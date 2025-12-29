import { describe, it, expect } from 'bun:test';
import { RuntimeFactory } from '../compiler/RuntimeFactory';
import { createTestableRuntime } from '../../testing/testable/TestableRuntime';
import { WodBlock } from '../../markdown-editor/types';
import { CodeStatement } from '../../core/models/CodeStatement';
import { JitCompiler } from '../compiler/JitCompiler';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

describe('Loop Detection 2', () => {
    it('should handle timer:complete for root without crash', () => {
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
                console.log(`Compile #${compileCount}`);
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
        console.log('After start:', testRuntime.stack.blocks.map(b => b.label));

        // Simulate timer:complete for root (before child is popped)
        console.log('\n=== timer:complete for root ===');
        testRuntime.simulateEvent('timer:complete', { blockId: 'root' });
        console.log('After timer:complete:', testRuntime.stack.blocks.map(b => b.label));

        // Try another timer:complete
        console.log('\n=== second timer:complete for root ===');
        testRuntime.simulateEvent('timer:complete', { blockId: 'root' });
        console.log('After 2nd timer:complete:', testRuntime.stack.blocks.map(b => b.label));

        expect(compileCount).toBeLessThan(10);
    });
});
