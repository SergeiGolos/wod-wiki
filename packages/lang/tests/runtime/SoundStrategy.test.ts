import { describe, it, expect } from 'vitest';
import { apply, stmtWith, stubRuntime } from '../harness/harness/StrategyTestHarness';
import { MetricType } from '@bitcobblers/wod-wiki-core';
import { BlockBuilder } from '../../src/runtime/compiler/BlockBuilder';
import { SoundStrategy } from '../../src/runtime/compiler/strategies/enhancements/SoundStrategy';
import { SoundCueBehavior } from '../../src/runtime/behaviors';

const runtime = stubRuntime();

describe('SoundStrategy', () => {
    it('matches non-empty statements', () => {
        expect(apply(new SoundStrategy(), [stmtWith(MetricType.Reps, 5)], runtime).matched).toBe(true);
    });

    it('does not match empty statements', () => {
        expect(apply(new SoundStrategy(), [], runtime).matched).toBe(false);
    });

    it('skips when SoundCueBehavior already present', () => {
        const builder = new BlockBuilder(runtime);
        builder.addBehavior(new SoundCueBehavior({ cues: [] }));
        new SoundStrategy().apply(builder, [stmtWith(MetricType.Reps, 5)], runtime);
        expect(builder.hasBehavior(SoundCueBehavior)).toBe(true);
    });

    it('adds countdown cues when countdown timer present', () => {
        const builder = new BlockBuilder(runtime);
        builder.asTimer({ direction: 'down', durationMs: 60000 });
        new SoundStrategy().apply(builder, [stmtWith(MetricType.Reps, 5)], runtime);
        expect(builder.hasBehavior(SoundCueBehavior)).toBe(true);
    });

    it('adds start-beep when countup timer present', () => {
        const builder = new BlockBuilder(runtime);
        builder.asTimer({ direction: 'up' });
        new SoundStrategy().apply(builder, [stmtWith(MetricType.Reps, 5)], runtime);
        expect(builder.hasBehavior(SoundCueBehavior)).toBe(true);
    });

    it('does nothing when no timer present', () => {
        const result = apply(new SoundStrategy(), [stmtWith(MetricType.Reps, 5)], runtime);
        expect(result.hasBehavior(SoundCueBehavior)).toBe(false);
    });
});
