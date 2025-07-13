
import { describe, it, expect } from 'vitest';
import { MetricComposer } from '../src/runtime/MetricComposer';
import { OverrideMetricInheritance, IgnoreMetricInheritance, InheritMetricInheritance } from '../src/runtime/MetricInheritance';
import { singleMetric, multipleMetrics, complexMetric } from './MetricComposer.fixture';
import { RuntimeMetric } from '../src/runtime/RuntimeMetric';

describe('MetricComposer', () => {
    it('should override a metric value', () => {
        const composer = new MetricComposer(JSON.parse(JSON.stringify(singleMetric)));
        const inheritance = [new OverrideMetricInheritance([{ type: 'time', value: 600, unit: 's' }])];
        const result = composer.compose(inheritance);
        expect(result[0].values[0].value).toBe(600);
    });

    it('should ignore a metric type', () => {
        const composer = new MetricComposer(JSON.parse(JSON.stringify(complexMetric)));
        const inheritance = [new IgnoreMetricInheritance(['repetitions'])];
        const result = composer.compose(inheritance);
        expect(result[0].values.some(v => v.type === 'repetitions')).toBe(false);
    });

    it('should inherit (add to) a metric value', () => {
        const composer = new MetricComposer(JSON.parse(JSON.stringify(singleMetric)));
        const inheritance = [new InheritMetricInheritance([{ type: 'time', value: 300, unit: 's' }])];
        const result = composer.compose(inheritance);
        expect(result[0].values[0].value).toBe(1500);
    });

    it('should handle multiple inheritance rules', () => {
        const composer = new MetricComposer(JSON.parse(JSON.stringify(complexMetric)));
        const inheritance = [
            new InheritMetricInheritance([{ type: 'repetitions', value: 10, unit: '' }]),
            new IgnoreMetricInheritance(['resistance'])
        ];
        const result = composer.compose(inheritance);
        expect(result[0].values.some(v => v.type === 'resistance')).toBe(false);
        expect(result[0].values.filter(v => v.type === 'repetitions').reduce((acc, v) => acc + v.value, 0)).toBe(75);
    });

    it('should not modify the original metric', () => {
        const originalMetric = JSON.parse(JSON.stringify(singleMetric));
        const composer = new MetricComposer(originalMetric);
        const inheritance = [new OverrideMetricInheritance([{ type: 'time', value: 600, unit: 's' }])];
        composer.compose(inheritance);
        expect(originalMetric[0].values[0].value).toBe(1200);
    });

    it('should handle multiple metrics', () => {
        const composer = new MetricComposer(JSON.parse(JSON.stringify(multipleMetrics)));
        const inheritance = [new InheritMetricInheritance([{ type: 'time', value: 100, unit: 's' }, { type: 'distance', value: 100, unit: 'm' }])];
        const result = composer.compose(inheritance);
        expect(result[0].values[0].value).toBe(1300);
        expect(result[1].values[0].value).toBe(500);
    });
});
