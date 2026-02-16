import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { TimerBehavior, RoundInitBehavior } from '@/runtime/behaviors';

describe('AmrapLogicStrategy Integration', () => {
    it('should compile "10:00 AMRAP" (no rounds keyword) into AMRAP block', () => {
        const harness = new RuntimeTestBuilder()
            .withScript('10:00 AMRAP')
            .withStrategy(new AmrapLogicStrategy())
            .build();

        const block = harness.pushStatement(0);

        expect(block).toBeDefined();
        expect(block.blockType).toBe('AMRAP');
        // Now uses aspect-based behaviors
        expect(block.getBehavior(TimerBehavior)).toBeDefined();
        // Should have RoundInitBehavior for unbounded rounds
        expect(block.getBehavior(RoundInitBehavior)).toBeDefined();
    });

    it('should compile "10:00 5 Rounds" into AMRAP block', () => {
        const harness = new RuntimeTestBuilder()
            .withScript('10:00 5 Rounds')
            .withStrategy(new AmrapLogicStrategy())
            .build();

        const block = harness.pushStatement(0);

        expect(block).toBeDefined();
        expect(block.blockType).toBe('AMRAP');
        // Now uses RoundInitBehavior for unbounded rounds
        expect(block.getBehavior(RoundInitBehavior)).toBeDefined();
    });
});
