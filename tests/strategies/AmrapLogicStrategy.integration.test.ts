import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { BoundTimerBehavior } from '@/runtime/behaviors/BoundTimerBehavior';
import { UnboundLoopBehavior } from '@/runtime/behaviors/UnboundLoopBehavior';

describe('AmrapLogicStrategy Integration', () => {
    it('should compile "10:00 AMRAP" (no rounds keyword) into AMRAP block', () => {
        const harness = new RuntimeTestBuilder()
            .withScript('10:00 AMRAP')
            .withStrategy(new AmrapLogicStrategy())
            .build();

        const block = harness.pushStatement(0);

        expect(block).toBeDefined();
        expect(block.blockType).toBe('AMRAP');
        expect(block.getBehavior(BoundTimerBehavior)).toBeDefined();
        // Should have UnboundLoopBehavior for infinite rounds
        expect(block.getBehavior(UnboundLoopBehavior)).toBeDefined();
    });

    it('should compile "10:00 5 Rounds" into AMRAP block', () => {
        const harness = new RuntimeTestBuilder()
            .withScript('10:00 5 Rounds')
            .withStrategy(new AmrapLogicStrategy())
            .build();

        const block = harness.pushStatement(0);

        expect(block).toBeDefined();
        expect(block.blockType).toBe('AMRAP');
        expect(block.getBehavior(UnboundLoopBehavior)).toBeDefined();
    });
});
