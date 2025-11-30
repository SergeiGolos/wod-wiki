import { describe, it, expect } from 'vitest';
import { RuntimeFactory } from '../RuntimeFactory';
import { createTestableRuntime } from '../testing/TestableRuntime';
import { WodBlock } from '../../markdown-editor/types';
import { CodeStatement } from '../../core/models/CodeStatement';
import { JitCompiler } from '../JitCompiler';
import { IScriptRuntime } from '../IScriptRuntime';

describe('RootLifecycle Integration', () => {
    it('should inject idle blocks at start and end of execution', () => {
        // 1. Setup
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

        // Mock Compiler
        const mockCompiler = {
            compile: (statements: any[], runtime: IScriptRuntime) => {
                // Return a dummy block
                return {
                    key: { toString: () => 'mock-child' },
                    mount: () => [],
                    next: () => [], // Immediately complete
                    unmount: () => [],
                    dispose: () => {},
                    getBehavior: () => undefined
                } as any;
            }
        } as JitCompiler;

        const factory = new RuntimeFactory(mockCompiler);
        const runtime = factory.createRuntime(block);
        
        if (!runtime) {
            throw new Error('Failed to create runtime');
        }

        const testRuntime = createTestableRuntime(runtime);

        // 2. Verify Initial State
        // Stack should be: [Idle, Root] (Top First)
        expect(testRuntime.stack.blocks.length).toBe(2);
        expect(testRuntime.stack.blocks[0].label).toBe('Ready'); // Initial Idle (Top)
        expect(testRuntime.stack.blocks[1].label).toBe('Workout'); // Root (Bottom)
        expect(testRuntime.getCurrentBlockKey()).toContain('idle-start');

        // 3. Start Execution (Pop Initial Idle)
        testRuntime.simulateNext(); // Should pop Idle

        // After pop, stack is [Root].
        expect(testRuntime.stack.blocks.length).toBe(1);
        expect(testRuntime.getCurrentBlockKey()).toContain('root');

        // Now we need to trigger the Root to push the child.
        testRuntime.simulateTick();

        // RootLifecycleBehavior.onNext (state=INITIAL_IDLE) -> transitions to EXECUTING -> calls loopCoordinator.onNext
        // loopCoordinator pushes the child (Pushups).
        
        // Stack should be: [Root, mock-child] (since we mocked JIT)
        // Wait, mock-child label?
        // The mock block doesn't have a label property in the mock object above.
        // I should add it.
        
        // 4. Simulate Completion of Children
        testRuntime.simulateTick(); // Advance loop
        testRuntime.simulateTick(); // Advance loop again
        
        // Eventually RootLifecycleBehavior should transition to FINAL_IDLE and push Final Idle block.
        
        let finalIdleFound = false;
        for (let i = 0; i < 10; i++) {
            testRuntime.simulateTick();
            const current = testRuntime.stack.current;
            if (current && current.label === 'Finished') {
                finalIdleFound = true;
                break;
            }
        }
        
        expect(finalIdleFound).toBe(true);
        expect(testRuntime.getCurrentBlockKey()).toContain('idle-end');
        
        // 5. Stop / View Results
        // Should pop Final Idle
        testRuntime.simulateEvent('stop');
        
        // Final Idle popped. Stack: [Root].
        // Root sees FINAL_IDLE state -> transitions to COMPLETE -> returns PopBlockAction.
        
        testRuntime.simulateTick();
        
        expect(testRuntime.stack.blocks.length).toBe(0);
        expect(testRuntime.isComplete()).toBe(true);
    });
});
