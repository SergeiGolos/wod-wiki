
import { describe, it, expect } from 'vitest';
import { MetricComposer } from './MetricComposer';
import { OverrideMetricInheritance, IgnoreMetricInheritance, InheritMetricInheritance } from './MetricInheritance';
import { singleMetric, multipleMetrics, complexMetric } from './MetricComposer.fixture';
import { RuntimeMetric } from './RuntimeMetric';

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

    it('should inherit a metric value only if type is not present', () => {
        // singleMetric has a 'time' value, so nothing should be added
        const composer = new MetricComposer(JSON.parse(JSON.stringify(singleMetric)));
        const inheritance = [new InheritMetricInheritance([{ type: 'time', value: 300, unit: 's' }])];
        const result = composer.compose(inheritance);
        // Should not add a new value, should remain the same
        expect(result[0].values.length).toBe(1);
        expect(result[0].values[0].type).toBe('time');
        expect(result[0].values[0].value).toBe(1200);

        // If we inherit a type not present, it should be added
        const composer2 = new MetricComposer(JSON.parse(JSON.stringify(singleMetric)));
        const inheritance2 = [new InheritMetricInheritance([{ type: 'distance', value: 400, unit: 'm' }])];
        const result2 = composer2.compose(inheritance2);
        expect(result2[0].values.length).toBe(2);
        expect(result2[0].values.some(v => v.type === 'distance' && v.value === 400)).toBe(true);
    });

  
    it('should not modify the original metric', () => {
        const originalMetric = JSON.parse(JSON.stringify(singleMetric));
        const composer = new MetricComposer(originalMetric);
        const inheritance = [new OverrideMetricInheritance([{ type: 'time', value: 600, unit: 's' }])];
        composer.compose(inheritance);
        expect(originalMetric[0].values[0].value).toBe(1200);
    });

    it('should handle multiple metrics and only add missing types', () => {
        const composer = new MetricComposer(JSON.parse(JSON.stringify(multipleMetrics)));
        const inheritance = [new InheritMetricInheritance([
            { type: 'time', value: 100, unit: 's' },
            { type: 'distance', value: 100, unit: 'm' },
            { type: 'calories', value: 50, unit: 'kcal' }
        ])];
        const result = composer.compose(inheritance);
        // 'time' and 'distance' already exist, so only 'calories' should be added
        expect(result[0].values.some(v => v.type === 'calories' && v.value === 50)).toBe(true);
        expect(result[0].values.some(v => v.type === 'time')).toBe(true);
        expect(result[1].values.some(v => v.type === 'distance')).toBe(true);
    });
});
