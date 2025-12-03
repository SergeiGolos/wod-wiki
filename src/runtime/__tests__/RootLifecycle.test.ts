import { describe, it, expect } from 'vitest';
import { RuntimeFactory } from '../RuntimeFactory';
import { createTestableRuntime } from '../testing/TestableRuntime';
import { WodBlock } from '../../markdown-editor/types';
import { CodeStatement } from '../../core/models/CodeStatement';
import { JitCompiler } from '../JitCompiler';
import { IScriptRuntime } from '../IScriptRuntime';
import { RuntimeControls } from '../models/MemoryModels';
import { TypedMemoryReference } from '../IMemoryReference';

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

    it('should register and update runtime controls', () => {
        // 1. Setup
        const block: WodBlock = {
            id: 'test-block',
            content: '10 Pushups',
            statements: [{ id: 1, type: 'movement', content: '10 Pushups', children: [] } as any]
        } as any;

        const mockCompiler = {
            compile: () => ({
                key: { toString: () => 'mock-child' },
                mount: () => [],
                next: () => [],
                unmount: () => [],
                dispose: () => {},
                getBehavior: () => undefined
            })
        } as any as JitCompiler;

        const factory = new RuntimeFactory(mockCompiler);
        const runtime = factory.createRuntime(block);
        
        if (!runtime) throw new Error('Failed to create runtime');

        // Helper to get controls (finds controls with buttons, prioritizing idle block controls)
        const getControls = () => {
            const refs = runtime.memory.search({
                type: 'runtime-controls',
                id: null,
                ownerId: null,
                visibility: null
            });
            if (refs.length === 0) return null;
            // Find controls with buttons (idle block's controls) or fall back to first
            for (const ref of refs) {
                const controls = runtime.memory.get(ref as TypedMemoryReference<RuntimeControls>);
                if (controls && controls.buttons.length > 0) {
                    return controls;
                }
            }
            // Fall back to first controls if none have buttons
            return runtime.memory.get(refs[0] as TypedMemoryReference<RuntimeControls>);
        };

        // 2. Verify Initial State (Idle)
        const initialControls = getControls();
        expect(initialControls).toBeDefined();
        expect(initialControls?.displayMode).toBe('clock');
        expect(initialControls?.buttons.length).toBe(1);
        expect(initialControls?.buttons[0].id).toBe('btn-start');

        // 3. Simulate Start (Transition to Executing)
        // We can simulate the timer:start event
        runtime.handle({ name: 'timer:start', timestamp: new Date(), data: {} });
        
        // This should pop the idle block and trigger onNext on Root
        // But runtime.handle processes events. RootLifecycleBehavior handles timer:start by returning PopBlockAction.
        // The runtime executes the action.
        
        // Verify controls updated
        const execControls = getControls();
        expect(execControls?.displayMode).toBe('timer');
        expect(execControls?.buttons.find(b => b.id === 'btn-pause')).toBeDefined();
        expect(execControls?.buttons.find(b => b.id === 'btn-next')).toBeDefined();
        expect(execControls?.buttons.find(b => b.id === 'btn-complete')).toBeDefined();

        // 4. Simulate Pause
        runtime.handle({ name: 'timer:pause', timestamp: new Date(), data: {} });
        const pausedControls = getControls();
        expect(pausedControls?.buttons.find(b => b.id === 'btn-resume')).toBeDefined();
        expect(pausedControls?.buttons.find(b => b.id === 'btn-pause')).toBeUndefined();

        // 5. Simulate Resume
        runtime.handle({ name: 'timer:resume', timestamp: new Date(), data: {} });
        const resumedControls = getControls();
        expect(resumedControls?.buttons.find(b => b.id === 'btn-pause')).toBeDefined();

        // 6. Simulate Complete
        runtime.handle({ name: 'timer:complete', timestamp: new Date(), data: {} });
        const completeControls = getControls();
        expect(completeControls?.buttons.length).toBe(1);
        expect(completeControls?.buttons[0].id).toBe('btn-analytics');
    });
});
