
import { describe, it, expect } from 'vitest';
import { MetricComposer } from './MetricComposer';
import { OverrideMetricInheritance, IgnoreMetricInheritance, InheritMetricInheritance } from './MetricInheritance';
import { singleMetric, multipleMetrics, complexMetric } from './MetricComposer.fixture';

describe('MetricInheritance', () => {
    describe('OverrideMetricInheritance', () => {
        it('should replace a single metric value', () => {
            const composer = new MetricComposer(JSON.parse(JSON.stringify(singleMetric)));
            const inheritance = [new OverrideMetricInheritance([{ type: 'time', value: 600, unit: 's' }])];
            const result = composer.compose(inheritance);
            expect(result[0].values).toHaveLength(1);
            expect(result[0].values[0]).toEqual({ type: 'time', value: 600, unit: 's' });
        });

        it('should replace multiple metric values of the same type', () => {
            const composer = new MetricComposer(JSON.parse(JSON.stringify(complexMetric)));
            const inheritance = [new OverrideMetricInheritance([{ type: 'repetitions', value: 10, unit: '' }])];
            const result = composer.compose(inheritance);
            expect(result[0].values.filter(v => v.type === 'repetitions')).toHaveLength(1);
            expect(result[0].values.find(v => v.type === 'repetitions')?.value).toBe(10);
        });
    });

    describe('IgnoreMetricInheritance', () => {
        it('should remove all metric values of a specific type', () => {
            const composer = new MetricComposer(JSON.parse(JSON.stringify(complexMetric)));
            const inheritance = [new IgnoreMetricInheritance(['repetitions'])];
            const result = composer.compose(inheritance);
            expect(result[0].values.some(v => v.type === 'repetitions')).toBe(false);
            expect(result[0].values.some(v => v.type === 'resistance')).toBe(true);
        });
    });

    describe('InheritMetricInheritance', () => {
        it('should not add when metric type already exists', () => {
            const composer = new MetricComposer(JSON.parse(JSON.stringify(singleMetric)));
            const inheritance = [new InheritMetricInheritance([{ type: 'time', value: 300, unit: 's' }])];
            const result = composer.compose(inheritance);
            // Should not add since 'time' already exists - value remains unchanged
            expect(result[0].values).toHaveLength(1);
            expect(result[0].values[0].value).toBe(1200);
        });

        it('should add new metric type when it does not exist', () => {
            const composer = new MetricComposer(JSON.parse(JSON.stringify(singleMetric)));
            const inheritance = [new InheritMetricInheritance([{ type: 'distance', value: 500, unit: 'm' }])];
            const result = composer.compose(inheritance);
            // Should add 'distance' since it doesn't exist
            expect(result[0].values).toHaveLength(2);
            expect(result[0].values.find(v => v.type === 'distance')?.value).toBe(500);
            expect(result[0].values.find(v => v.type === 'time')?.value).toBe(1200);
        });

        it('should not add when multiple metric values of same type exist', () => {
            const composer = new MetricComposer(JSON.parse(JSON.stringify(complexMetric)));
            const inheritance = [new InheritMetricInheritance([{ type: 'repetitions', value: 10, unit: '' }])];
            const result = composer.compose(inheritance);
            const reps = result[0].values.filter(v => v.type === 'repetitions');
            // Should not add since 'repetitions' already exists - values remain unchanged
            expect(reps).toHaveLength(3);
            expect(reps[0].value).toBe(21);
            expect(reps[1].value).toBe(15);
            expect(reps[2].value).toBe(9);
        });
    });

    describe('Chained Inheritance', () => {
        it('should apply multiple inheritance rules in order', () => {
            const composer = new MetricComposer(JSON.parse(JSON.stringify(complexMetric)));
            const inheritance = [
                new InheritMetricInheritance([{ type: 'repetitions', value: 10, unit: '' }]),
                new OverrideMetricInheritance([{ type: 'resistance', value: 200, unit: 'lb' }]),
                new IgnoreMetricInheritance(['time']) // This should do nothing as there is no time metric
            ];
            const result = composer.compose(inheritance);
            const reps = result[0].values.filter(v => v.type === 'repetitions');
            // InheritMetricInheritance does nothing since 'repetitions' already exists
            expect(reps[0].value).toBe(21);
            expect(reps[1].value).toBe(15);
            expect(reps[2].value).toBe(9);
            // OverrideMetricInheritance replaces resistance value
            expect(result[0].values.find(v => v.type === 'resistance')?.value).toBe(200);
        });

        it('should add new types and override existing ones', () => {
            const composer = new MetricComposer(JSON.parse(JSON.stringify(singleMetric)));
            const inheritance = [
                new InheritMetricInheritance([{ type: 'distance', value: 400, unit: 'm' }]), // Should add
                new InheritMetricInheritance([{ type: 'time', value: 300, unit: 's' }]),     // Should not add
                new OverrideMetricInheritance([{ type: 'time', value: 600, unit: 's' }])    // Should override
            ];
            const result = composer.compose(inheritance);
            expect(result[0].values).toHaveLength(2);
            expect(result[0].values.find(v => v.type === 'distance')?.value).toBe(400);
            expect(result[0].values.find(v => v.type === 'time')?.value).toBe(600);
        });
    });
});
