
import { describe, it, expect } from 'vitest';
import { RuntimeJitStrategies } from './RuntimeJitStrategies';
import { EffortStrategy, CountdownStrategy, RoundsStrategy } from './strategies';
import { EffortBlock, CountdownParentBlock, RoundsParentBlock } from './blocks';
import { RuntimeMetric } from './RuntimeMetric';

describe('JIT Strategy Selection', () => {
    it('should select the CountdownStrategy for a countdown timer', () => {
        const strategies = new RuntimeJitStrategies();
        strategies.addStrategy(new CountdownStrategy());
        strategies.addStrategy(new RoundsStrategy());
        strategies.addStrategy(new EffortStrategy());

        const metrics: RuntimeMetric[] = [{
            sourceId: 'test-1',
            effort: 'countdown',
            values: [{ type: 'time', value: -60, unit: 's' }]
        }];
        const block = strategies.compile(metrics);

        expect(block).toBeInstanceOf(CountdownParentBlock);
    });

    it('should select the RoundsStrategy for a rounds-based workout', () => {
        const strategies = new RuntimeJitStrategies();
        strategies.addStrategy(new CountdownStrategy());
        strategies.addStrategy(new RoundsStrategy());
        strategies.addStrategy(new EffortStrategy());

        const metrics: RuntimeMetric[] = [{
            sourceId: 'test-2',
            effort: 'rounds',
            values: [{ type: 'rounds', value: 5, unit: '' }]
        }];
        const block = strategies.compile(metrics);

        expect(block).toBeInstanceOf(RoundsParentBlock);
    });

    it('should select the EffortStrategy as the default', () => {
        const strategies = new RuntimeJitStrategies();
        strategies.addStrategy(new CountdownStrategy());
        strategies.addStrategy(new RoundsStrategy());
        strategies.addStrategy(new EffortStrategy());

        const metrics: RuntimeMetric[] = [{
            sourceId: 'test-3',
            effort: 'push-ups',
            values: [{ type: 'repetitions', value: 10, unit: '' }]
        }];
        const block = strategies.compile(metrics);

        expect(block).toBeInstanceOf(EffortBlock);
    });
});
