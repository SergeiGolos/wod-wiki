import { describe, it, expect, afterEach } from 'bun:test';
import { LabelingBehavior } from '../LabelingBehavior';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { CurrentRoundMetric } from '../../compiler/metrics/CurrentRoundMetric';
import { MemoryLocation } from '../../memory/MemoryLocation';

function getDisplayTextByRole(block: MockBlock, role: string): string | undefined {
    const location = block.getMemoryByTag('display')[0];
    if (!location) return undefined;

    const metric = location.metrics.find(m => {
        const value = m.value as { role?: string } | undefined;
        return value?.role === role;
    });

    return (metric?.value as { text?: string } | undefined)?.text;
}

describe('LabelingBehavior', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    function setup(behavior: LabelingBehavior, opts?: { preRound?: { current: number; total: number | undefined } }) {
        harness = new BehaviorTestHarness().withClock(new Date('2024-01-01T00:00:00Z'));
        const block = new MockBlock('test-block', [behavior], { label: 'Fallback Label' });
        if (opts?.preRound) {
            block.pushMemory(new MemoryLocation('round', [
                new CurrentRoundMetric(opts.preRound.current, opts.preRound.total, 'test-block', new Date())
            ]));
        }
        harness.push(block);
        harness.mount();
        return block;
    }

    it('sets label from config', () => {
        const block = setup(new LabelingBehavior({ label: 'Configured Label' }));
        expect(getDisplayTextByRole(block, 'label')).toBe('Configured Label');
    });

    it('falls back to block.label when no config.label', () => {
        const block = setup(new LabelingBehavior());
        expect(getDisplayTextByRole(block, 'label')).toBe('Fallback Label');
    });

    it('sets subtitle metrics', () => {
        const block = setup(new LabelingBehavior({ subtitle: 'Warm-up' }));
        expect(getDisplayTextByRole(block, 'subtitle')).toBe('Warm-up');
    });

    it('sets actionDisplay metrics', () => {
        const block = setup(new LabelingBehavior({ actionDisplay: 'Run' }));
        expect(getDisplayTextByRole(block, 'action')).toBe('Run');
    });

    it('emits all configured labels into display memory on mount', () => {
        const block = setup(new LabelingBehavior({
            label: 'EMOM',
            subtitle: 'Every minute',
            actionDisplay: 'Burpees'
        }));

        const location = block.getMemoryByTag('display')[0];
        expect(location).toBeDefined();
        expect(location.metrics).toHaveLength(3);
    });

    it('shows round display when round memory is present', () => {
        const block = setup(
            new LabelingBehavior({ label: 'Rounds' }),
            { preRound: { current: 2, total: 5 } }
        );
        expect(getDisplayTextByRole(block, 'round')).toBe('Round 2 of 5');
    });

    it('skips round display when no round memory exists', () => {
        const block = setup(new LabelingBehavior({ label: 'Rounds' }));
        expect(getDisplayTextByRole(block, 'round')).toBeUndefined();
    });

    it('formats unbounded rounds as "Round X"', () => {
        const block = setup(
            new LabelingBehavior({ label: 'AMRAP' }),
            { preRound: { current: 3, total: undefined } }
        );
        expect(getDisplayTextByRole(block, 'round')).toBe('Round 3');
    });

    it('updates round display on next()', () => {
        harness = new BehaviorTestHarness().withClock(new Date('2024-01-01T00:00:00Z'));
        const block = new MockBlock('test-block', [new LabelingBehavior({ label: 'Rounds' })], { label: 'Fallback Label' });
        const roundLoc = new MemoryLocation('round', [new CurrentRoundMetric(1, 3, 'test-block', new Date())]);
        block.pushMemory(roundLoc);
        harness.push(block);
        harness.mount();

        roundLoc.update([new CurrentRoundMetric(2, 3, 'test-block', new Date())]);
        harness.next();

        expect(getDisplayTextByRole(block, 'round')).toBe('Round 2 of 3');
    });

    it('does not accumulate duplicate round metrics', () => {
        harness = new BehaviorTestHarness().withClock(new Date('2024-01-01T00:00:00Z'));
        const block = new MockBlock('test-block', [new LabelingBehavior({ label: 'Rounds' })], { label: 'Fallback Label' });
        const roundLoc = new MemoryLocation('round', [new CurrentRoundMetric(1, 3, 'test-block', new Date())]);
        block.pushMemory(roundLoc);
        harness.push(block);
        harness.mount();

        roundLoc.update([new CurrentRoundMetric(2, 3, 'test-block', new Date())]);
        harness.next();

        roundLoc.update([new CurrentRoundMetric(3, 3, 'test-block', new Date())]);
        harness.next();

        const display = block.getMemoryByTag('display')[0];
        const roundFragments = display.metrics.filter(metric => {
            const value = metric.value as { role?: string } | undefined;
            return value?.role === 'round';
        });

        expect(roundFragments).toHaveLength(1);
    });

    it('supports custom round formatter', () => {
        harness = new BehaviorTestHarness().withClock(new Date('2024-01-01T00:00:00Z'));
        const block = new MockBlock('test-block', [new LabelingBehavior({
            roundFormat: (current, total) => `Set ${current}/${total ?? '?'}`
        })], { label: 'Fallback Label' });
        block.pushMemory(new MemoryLocation('round', [new CurrentRoundMetric(2, 4, 'test-block', new Date())]));
        harness.push(block);
        harness.mount();

        expect(getDisplayTextByRole(block, 'round')).toBe('Set 2/4');
    });

    it('respects showRoundDisplay=false even when round memory exists', () => {
        const block = setup(
            new LabelingBehavior({ showRoundDisplay: false }),
            { preRound: { current: 1, total: 5 } }
        );
        expect(getDisplayTextByRole(block, 'round')).toBeUndefined();
    });
});