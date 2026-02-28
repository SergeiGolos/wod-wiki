
import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { ICodeStatement } from '@/core/models/CodeStatement';
import { AmrapBlock } from '@/runtime/typed-blocks';

describe('For Time Child Single Pass Test', () => {
    it('should compile a zero-duration timer with children as AMRAP block', () => {
        // "For Time" implied by 0:00 timer value
        // The TypedBlockFactory creates an AmrapBlock for timer + children
        // 0:00 duration results in a 0ms timer that completes immediately

        const script = `0:00
  5 pullups
  10 push ups`;

        const builder = new RuntimeTestBuilder()
            .withScript(script);

        const testHarness = builder.build();

        const statement = testHarness.script.statements[0];
        const block = testHarness.jit.compile([statement as ICodeStatement], testHarness.runtime);
        if (!block) throw new Error('Failed to compile block');

        // TypedBlockFactory creates AmrapBlock for timer + children
        expect(block).toBeInstanceOf(AmrapBlock);
        expect(block.blockType).toBe('AMRAP');

        testHarness.runtime.pushBlock(block);

        // First child pushed on mount
        expect(testHarness.currentBlock?.label).toBe('5 pullups');
    });
});
