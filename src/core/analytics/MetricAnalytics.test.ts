import { describe, it, expect } from 'vitest';
import { RepAnalyticsProcess } from './RepAnalyticsProcess';
import { DistanceAnalyticsProcess } from './DistanceAnalyticsProcess';
import { WeightAnalyticsProcess } from './WeightAnalyticsProcess';
import { OutputStatement } from '../models/OutputStatement';
import { FragmentType } from '../models/CodeFragment';
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
                fragments: [
                    { fragmentType: FragmentType.Elapsed, type: 'elapsed', value: 10000, origin: 'runtime' },
                    { fragmentType: FragmentType.Rep, type: 'rep', value: 20, origin: 'runtime' },
                    { fragmentType: FragmentType.Effort, type: 'effort', value: 'hard', origin: 'parser' }
                ]
            });

            process.process(segment);
            const results = process.finalize();

            expect(results.some(o => o.fragments.some(f => f.type === 'total_reps' && f.value === 20))).toBe(true);
            expect(results.some(o => o.fragments.some(f => f.type === 'effort_reps' && f.value === 20))).toBe(true);
            expect(results.some(o => o.fragments.some(f => f.type === 'reps_per_second' && f.value === 2))).toBe(true);
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
                fragments: [
                    { fragmentType: FragmentType.Elapsed, type: 'elapsed', value: 10000, origin: 'runtime' },
                    { fragmentType: FragmentType.Distance, type: 'distance', value: { amount: 100, units: 'm' }, origin: 'runtime' },
                    { fragmentType: FragmentType.Effort, type: 'effort', value: 'easy', origin: 'parser' }
                ]
            });

            process.process(segment);
            const results = process.finalize();

            expect(results.some(o => o.fragments.some(f => f.type === 'total_distance' && f.value === 100))).toBe(true);
            expect(results.some(o => o.fragments.some(f => f.type === 'effort_distance' && f.value === 100))).toBe(true);
            expect(results.some(o => o.fragments.some(f => f.type === 'distance_per_second' && f.value === 10))).toBe(true);
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
                fragments: [
                    { fragmentType: FragmentType.Elapsed, type: 'elapsed', value: 10000, origin: 'runtime' },
                    { fragmentType: FragmentType.Rep, type: 'rep', value: 10, origin: 'runtime' },
                    { fragmentType: FragmentType.Resistance, type: 'resistance', value: { amount: 50, units: 'kg' }, origin: 'runtime' },
                    { fragmentType: FragmentType.Effort, type: 'effort', value: 'hard', origin: 'parser' }
                ]
            });

            process.process(segment);
            const results = process.finalize();

            // Total Volume = 10 reps * 50kg = 500
            expect(results.some(o => o.fragments.some(f => f.type === 'total_weight' && f.value === 500))).toBe(true);
            expect(results.some(o => o.fragments.some(f => f.type === 'effort_weight' && f.value === 500))).toBe(true);
            expect(results.some(o => o.fragments.some(f => f.type === 'weight_per_second' && f.value === 50))).toBe(true);
        });
    });
});
