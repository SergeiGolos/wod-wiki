import { describe, it, expect } from 'vitest';
import { MetricComposer } from './MetricComposer';
import { OverrideMetricInheritance, InheritMetricInheritance } from './MetricInheritance';
import { RuntimeMetric } from './RuntimeMetric';
import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../BlockKey';
import { IMetricInheritance } from './IMetricInheritance';
import { IRuntimeEvent, EventHandler } from './EventHandler';
import { IResultSpanBuilder } from './ResultSpanBuilder';
import { RuntimeBlockWithMemoryBase } from './RuntimeBlockWithMemoryBase';

class MockRuntimeBlock extends RuntimeBlockWithMemoryBase {
    constructor(
        key: BlockKey,
        private inheritanceRules: IMetricInheritance[] = [],
        metrics: RuntimeMetric[] = []
    ) {
        super(key, metrics);
    }

    protected initializeMemory(): void {
        // Mock implementation
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        return {
            create: () => ({ blockKey: this.key.toString(), timeSpan: {}, metrics: [], duration: 0 }),
            getSpans: () => [],
            close: () => {},
            start: () => {},
            stop: () => {}
        };
    }

    protected createInitialHandlers(): EventHandler[] {
        return [];
    }

    protected onPush(): IRuntimeEvent[] {
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        return undefined;
    }

    protected onPop(): void {
        // Mock completion
    }

    // Keep the inheritance method for testing
    inherit(): IMetricInheritance[] {
        return this.inheritanceRules;
    }

    // Helper method to get metrics for testing
    getTestMetrics(): RuntimeMetric[] {
        return this.initialMetrics;
    }
}

describe('Runtime Block Composition', () => {

    it('should apply inheritance rules from parent to child (Innermost-Out)', () => {
        const childMetrics: RuntimeMetric[] = [{ sourceId: 'child', values: [{ type: 'repetitions', value: 10, unit: 'reps' }] }];
        const childBlock = new MockRuntimeBlock(new BlockKey('child'), [], childMetrics);

        const parentBlock = new MockRuntimeBlock(new BlockKey('parent'), [new InheritMetricInheritance([{ type: 'repetitions', value: 5, unit: 'reps' }])]);
        const grandparentBlock = new MockRuntimeBlock(new BlockKey('grandparent'), [new OverrideMetricInheritance([{ type: 'repetitions', value: 1, unit: 'reps' }])]);

        const inheritanceStack = [...grandparentBlock.inherit(), ...parentBlock.inherit()];

        const composer = new MetricComposer(childBlock.getTestMetrics());
        const result = composer.compose(inheritanceStack);

        expect(result[0].values[0].value).toBe(1);
    });

    it('should not apply inheritance if a block returns null', () => {
        const childMetrics: RuntimeMetric[] = [{ sourceId: 'child', values: [{ type: 'repetitions', value: 10, unit: 'reps' }] }];
        const childBlock = new MockRuntimeBlock(new BlockKey('child'), [], childMetrics);

        const parentBlock = new MockRuntimeBlock(new BlockKey('parent'), []);
        const grandparentBlock = new MockRuntimeBlock(new BlockKey('grandparent'), [new InheritMetricInheritance([{ type: 'repetitions', value: 5, unit: 'reps' }])]);

        const inheritanceStack = [...grandparentBlock.inherit(), ...parentBlock.inherit()];

        const composer = new MetricComposer(childBlock.getTestMetrics());
        const result = composer.compose(inheritanceStack);

        expect(result[0].values[0].value).toBe(10);
    });
});
