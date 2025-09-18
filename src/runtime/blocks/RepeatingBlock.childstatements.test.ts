import { describe, it, expect, beforeEach } from 'vitest';
import { RepeatingBlock } from './RepeatingBlock';
import { BlockKey } from '../../BlockKey';
import { RuntimeMetric } from '../RuntimeMetric';
import { RuntimeMemory } from '../memory/RuntimeMemory';
import { ScriptRuntimeWithMemory } from '../ScriptRuntimeWithMemory';
import { JitCompiler } from '../JitCompiler';
import { WodScript } from '../../WodScript';

describe('RepeatingBlock Child Statements', () => {
    let block: RepeatingBlock;
    let memory: RuntimeMemory;
    let runtime: ScriptRuntimeWithMemory;

    beforeEach(() => {
        const key = new BlockKey('test-repeating');
        const metrics: RuntimeMetric[] = [
            {
                sourceId: 'test',
                values: [{ type: 'rounds', value: 3, unit: 'rounds' }]
            }
        ];
        
        // Create mock script with parent-child hierarchy
        const script = new WodScript('test script', [
            { id: 1, meta: { columnStart: 1 }, children: [2, 3], fragments: [] } as any, // Parent block
            { id: 2, meta: { columnStart: 5 }, children: [], fragments: [] } as any,     // Child 1 (indented)
            { id: 3, meta: { columnStart: 5 }, children: [], fragments: [] } as any      // Child 2 (indented)
        ]);
        
        const jitCompiler = {} as JitCompiler; // Mock JIT compiler
    memory = new RuntimeMemory();
    runtime = new ScriptRuntimeWithMemory(script, jitCompiler);
        
        block = new RepeatingBlock(key, metrics);
    block.setRuntime(runtime);
    block.push(runtime);
    });

    it('should identify and store child statements during initialization', () => {
        // Create a test block that uses the same sourceId as one of the statements
        const key = new BlockKey('test-repeating');
        const metrics: RuntimeMetric[] = [
            {
                sourceId: '1', // This should match the parent statement ID
                values: [{ type: 'rounds', value: 3, unit: 'rounds' }]
            }
        ];
        
        const testBlock = new RepeatingBlock(key, metrics);
    testBlock.setRuntime(runtime);
    testBlock.push(runtime);
        
        // Get the loop state to check if child statements are populated
        const loopState = testBlock.getLoopState();
        
        // After implementing the fix, this should contain the child statement objects
        expect(loopState.childStatements).toHaveLength(2);
        expect(loopState.childStatements[0].id).toBe(2);
        expect(loopState.childStatements[1].id).toBe(3);
    });

    it('should cycle through child statements when hasNextChild and advanceToNextChild are called', () => {
        // Create a test block that uses the same sourceId as one of the statements
        const key = new BlockKey('test-repeating');
        const metrics: RuntimeMetric[] = [
            {
                sourceId: '1', // This should match the parent statement ID
                values: [{ type: 'rounds', value: 2, unit: 'rounds' }] // 2 rounds for testing
            }
        ];
        
        const testBlock = new RepeatingBlock(key, metrics);
    testBlock.setRuntime(runtime);
    testBlock.push(runtime);
        
        // Initially should have next child (child index starts at -1)
        expect(testBlock.hasNextChild()).toBe(true);
        
        // Advance to first child (index 0)
        testBlock.advanceToNextChild();
        let state = testBlock.getLoopState();
        expect(state.currentChildIndex).toBe(0);
        expect(state.remainingRounds).toBe(2);
        
        // Should still have next child (second child in round 1)
        expect(testBlock.hasNextChild()).toBe(true);
        
        // Advance to second child (index 1)
        testBlock.advanceToNextChild();
        state = testBlock.getLoopState();
        expect(state.currentChildIndex).toBe(1);
        expect(state.remainingRounds).toBe(2);
        
        // Should still have next child (start of round 2)
        expect(testBlock.hasNextChild()).toBe(true);
        
        // Advance to start of round 2 (back to index 0, rounds decremented)
        testBlock.advanceToNextChild();
        state = testBlock.getLoopState();
        expect(state.currentChildIndex).toBe(0);
        expect(state.remainingRounds).toBe(1);
        
        // Complete the final round
        testBlock.advanceToNextChild();
        state = testBlock.getLoopState();
        expect(state.currentChildIndex).toBe(1);
        expect(state.remainingRounds).toBe(1);
        
        testBlock.advanceToNextChild();
        state = testBlock.getLoopState();
        expect(state.remainingRounds).toBe(0);
        
        // Should have no more children
        expect(testBlock.hasNextChild()).toBe(false);
    });

    // Note: onNext no longer returns child blocks directly; scheduling moved to runtime/handlers.
});