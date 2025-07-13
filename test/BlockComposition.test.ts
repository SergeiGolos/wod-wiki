
import { describe, it, expect } from 'vitest';
import { MetricComposer } from '../src/runtime/MetricComposer';
import { OverrideMetricInheritance, IgnoreMetricInheritance, InheritMetricInheritance } from '../src/runtime/MetricInheritance';
import { RuntimeMetric } from '../src/runtime/RuntimeMetric';
import { IRuntimeBlock } from '../src/runtime/IRuntimeBlock';
import { BlockKey } from '../src/BlockKey';
import { IMetricInheritance } from '../src/runtime/IMetricInheritance';

class MockRuntimeBlock implements IRuntimeBlock {
    public parent?: IRuntimeBlock;
    public metrics: RuntimeMetric[] = [];

    constructor(
        public readonly key: BlockKey,
        private inheritanceRules: IMetricInheritance[] = []
    ) {}

    inherit(): IMetricInheritance[] {
        return this.inheritanceRules;
    }
    
    // Other IRuntimeBlock methods are not needed for this test
    public spans: any;
    public handlers: any;
    next: any;
    onEnter: any;
}

describe('Runtime Block Composition', () => {

    it('should apply inheritance rules from parent to child (Innermost-Out)', () => {
        const childBlock = new MockRuntimeBlock(new BlockKey('child'));
        childBlock.metrics = [{ sourceId: 'child', effort: 'Push-ups', values: [{ type: 'repetitions', value: 10, unit: 'reps' }] }];

        const parentBlock = new MockRuntimeBlock(new BlockKey('parent'), [new InheritMetricInheritance([{ type: 'repetitions', value: 5, unit: 'reps' }])]);
        const grandparentBlock = new MockRuntimeBlock(new BlockKey('grandparent'), [new OverrideMetricInheritance([{ type: 'repetitions', value: 1, unit: 'reps' }])]);

        const inheritanceStack = [...grandparentBlock.inherit(), ...parentBlock.inherit()];

        const composer = new MetricComposer(childBlock.metrics);
        const result = composer.compose(inheritanceStack);

        expect(result[0].values[0].value).toBe(1);
    });

    it('should not apply inheritance if a block returns null', () => {
        const childBlock = new MockRuntimeBlock(new BlockKey('child'));
        childBlock.metrics = [{ sourceId: 'child', effort: 'Push-ups', values: [{ type: 'repetitions', value: 10, unit: 'reps' }] }];

        const parentBlock = new MockRuntimeBlock(new BlockKey('parent'), []);
        const grandparentBlock = new MockRuntimeBlock(new BlockKey('grandparent'), [new InheritMetricInheritance([{ type: 'repetitions', value: 5, unit: 'reps' }])]);

        const inheritanceStack = [...grandparentBlock.inherit(), ...parentBlock.inherit()];

        const composer = new MetricComposer(childBlock.metrics);
        const result = composer.compose(inheritanceStack);

        expect(result[0].values[0].value).toBe(15);
    });
});
