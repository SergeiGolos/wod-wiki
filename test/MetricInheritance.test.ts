
import { describe, it, expect } from 'vitest';
import { MetricComposer } from '../src/runtime/MetricComposer';
import { OverrideMetricInheritance, IgnoreMetricInheritance, InheritMetricInheritance } from '../src/runtime/MetricInheritance';
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
        it('should add to a single metric value', () => {
            const composer = new MetricComposer(JSON.parse(JSON.stringify(singleMetric)));
            const inheritance = [new InheritMetricInheritance([{ type: 'time', value: 300, unit: 's' }])];
            const result = composer.compose(inheritance);
            expect(result[0].values[0].value).toBe(1500);
        });

        it('should add to multiple metric values of the same type', () => {
            const composer = new MetricComposer(JSON.parse(JSON.stringify(complexMetric)));
            const inheritance = [new InheritMetricInheritance([{ type: 'repetitions', value: 10, unit: '' }])];
            const result = composer.compose(inheritance);
            const reps = result[0].values.filter(v => v.type === 'repetitions');
            expect(reps[0].value).toBe(31);
            expect(reps[1].value).toBe(25);
            expect(reps[2].value).toBe(19);
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
            expect(reps[0].value).toBe(31);
            expect(reps[1].value).toBe(25);
            expect(reps[2].value).toBe(19);
            expect(result[0].values.find(v => v.type === 'resistance')?.value).toBe(200);
        });
    });
});
