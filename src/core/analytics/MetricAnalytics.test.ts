import { describe, it, expect } from 'vitest';
import { RepAnalyticsProcess } from './RepAnalyticsProcess';
import { DistanceAnalyticsProcess } from './DistanceAnalyticsProcess';
import { WeightAnalyticsProcess } from './WeightAnalyticsProcess';
import { OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { TimeSpan } from '../../runtime/models/TimeSpan';

describe('Metric Analytics Processes', () => {
    const now = new Date();

    describe('RepAnalyticsProcess', () => {
        it('should track total reps, effort breakdown, and reps per second', () => {
            const process = new RepAnalyticsProcess();
            const segment = new OutputStatement({
                outputType: 'segment',
                sourceBlockKey: 'b1',
                stackLevel: 1,
                timeSpan: new TimeSpan(now.getTime(), now.getTime() + 10000), // 10s
                metrics: [
                    { type: MetricType.Elapsed, value: 10000, origin: 'runtime' },
                    { type: MetricType.Rep, value: 20, origin: 'runtime' },
                    { type: MetricType.Effort, value: 'hard', origin: 'parser' }
                ]
            });

            process.process(segment);
            const results = process.finalize();

            expect(results.some(o => o.metrics.some(f => f.type === MetricType.Metric && f.value === 20))).toBe(true);
            expect(results.some(o => o.metrics.some(f => f.type === MetricType.Metric && f.image?.includes('Total Reps (hard)') && f.value === 20))).toBe(true);
            expect(results.some(o => o.metrics.some(f => f.type === MetricType.Metric && f.image?.includes('Reps per Second') && f.value === 2))).toBe(true);
        });
    });

    describe('DistanceAnalyticsProcess', () => {
        it('should track total distance, effort breakdown, and distance per second', () => {
            const process = new DistanceAnalyticsProcess();
            const segment = new OutputStatement({
                outputType: 'segment',
                sourceBlockKey: 'b1',
                stackLevel: 1,
                timeSpan: new TimeSpan(now.getTime(), now.getTime() + 10000), // 10s
                metrics: [
                    { type: MetricType.Elapsed, value: 10000, origin: 'runtime' },
                    { type: MetricType.Distance, value: { amount: 100, units: 'm' }, origin: 'runtime' },
                    { type: MetricType.Effort, value: 'easy', origin: 'parser' }
                ]
            });

            process.process(segment);
            const results = process.finalize();

            expect(results.some(o => o.metrics.some(f => f.type === MetricType.Metric && f.value === 100 && f.image?.includes('Total Distance')))).toBe(true);
            expect(results.some(o => o.metrics.some(f => f.type === MetricType.Metric && f.value === 100 && f.image?.includes('Total Distance (easy)')))).toBe(true);
            expect(results.some(o => o.metrics.some(f => f.type === MetricType.Metric && f.value === 10 && f.image?.includes('Distance per Second')))).toBe(true);
        });
    });

    describe('WeightAnalyticsProcess', () => {
        it('should track total volume (reps * weight), effort breakdown, and weight per second', () => {
            const process = new WeightAnalyticsProcess();
            const segment = new OutputStatement({
                outputType: 'segment',
                sourceBlockKey: 'b1',
                stackLevel: 1,
                timeSpan: new TimeSpan(now.getTime(), now.getTime() + 10000), // 10s
                metrics: [
                    { type: MetricType.Elapsed, value: 10000, origin: 'runtime' },
                    { type: MetricType.Rep, value: 10, origin: 'runtime' },
                    { type: MetricType.Resistance, value: { amount: 50, units: 'kg' }, origin: 'runtime' },
                    { type: MetricType.Effort, value: 'hard', origin: 'parser' }
                ]
            });

            process.process(segment);
            const results = process.finalize();

            // Total Volume = 10 reps * 50kg = 500
            expect(results.some(o => o.metrics.some(f => f.type === MetricType.Metric && f.value === 500 && f.image?.includes('Total Weight')))).toBe(true);
            expect(results.some(o => o.metrics.some(f => f.type === MetricType.Metric && f.value === 500 && f.image?.includes('Total Weight (hard)')))).toBe(true);
            expect(results.some(o => o.metrics.some(f => f.type === MetricType.Metric && f.value === 50 && f.image?.includes('Weight per Second')))).toBe(true);
        });
    });
});
