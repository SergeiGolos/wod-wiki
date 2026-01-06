
import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';
import { BoundTimerBehavior } from '@/runtime/behaviors/BoundTimerBehavior';
import { ChildRunnerBehavior } from '@/runtime/behaviors/ChildRunnerBehavior';
import { ICodeStatement } from '@/core/models/CodeStatement';

describe('Timer Child Rotation Test', () => {
    it.failing('should rotate children during timer execution', () => {
        const script = `20:00
  5 pullups
  10 push ups
  15 squats`;

        const builder = new RuntimeTestBuilder()
            .withScript(script)
            .withStrategy(new GenericTimerStrategy())
            .withStrategy(new ChildrenStrategy())
            .withStrategy(new EffortFallbackStrategy());

        const testHarness = builder.build();

        const statement = testHarness.script.statements[0];
        const block = testHarness.jit.compile([statement as ICodeStatement], testHarness.runtime);
        if (!block) throw new Error('Failed to compile block');

        testHarness.runtime.pushBlock(block);

        expect(block.blockType).toBe('Timer');

        // 1. First Child: 5 pullups
        expect(testHarness.stackDepth).toBe(2);
        expect(testHarness.currentBlock?.label).toBe('5 pullups');

        // Complete 1st child
        testHarness.runtime.popBlock();

        // 2. Second Child: 10 push ups
        expect(testHarness.stackDepth).toBe(2);
        expect(testHarness.currentBlock?.label).toBe('10 push ups');

        // Complete 2nd child
        testHarness.runtime.popBlock();

        // 3. Third Child: 15 squats
        expect(testHarness.stackDepth).toBe(2);
        expect(testHarness.currentBlock?.label).toBe('15 squats');

        // Complete 3rd child
        testHarness.runtime.popBlock();

        // 4. Back to First Child: 5 pullups (Rotation Verification)
        expect(testHarness.stackDepth).toBe(2);
        expect(testHarness.currentBlock?.label).toBe('5 pullups');
    });
});
