import { describe, it, expect } from 'vitest';
import { SummaryAnalyticsProcess } from './SummaryAnalyticsProcess';
import { OutputStatement } from '../models/OutputStatement';
import { FragmentType } from '../models/CodeFragment';
import { TimeSpan } from '../../runtime/models/TimeSpan';

describe('SummaryAnalyticsProcess', () => {
    it('should accumulate reps, distance, and weight from leaf segments', () => {
        const process = new SummaryAnalyticsProcess();
        const now = new Date();

        const segment1 = new OutputStatement({
            outputType: 'segment',
            sourceBlockKey: 'block1',
            stackLevel: 1,
            timeSpan: new TimeSpan(now.getTime(), now.getTime() + 10000), // 10s
            fragments: [
                { fragmentType: FragmentType.Elapsed, type: 'elapsed', value: 10000, origin: 'runtime' },
                { fragmentType: FragmentType.Rep, type: 'rep', value: 10, origin: 'runtime' },
                { fragmentType: FragmentType.Resistance, type: 'resistance', value: { amount: 20, units: 'kg' }, origin: 'runtime' }
            ]
        });

        const segment2 = new OutputStatement({
            outputType: 'segment',
            sourceBlockKey: 'block2',
            stackLevel: 1,
            timeSpan: new TimeSpan(now.getTime() + 10000, now.getTime() + 20000), // 10s
            fragments: [
                { fragmentType: FragmentType.Elapsed, type: 'elapsed', value: 10000, origin: 'runtime' },
                { fragmentType: FragmentType.Distance, type: 'distance', value: { amount: 100, units: 'm' }, origin: 'runtime' }
            ]
        });

        process.process(segment1);
        process.process(segment2);

        const results = process.finalize();

        const totalReps = results.find(o => o.fragments.some(f => f.type === 'total_reps'));
        const totalDistance = results.find(o => o.fragments.some(f => f.type === 'total_distance'));
        const totalWeight = results.find(o => o.fragments.some(f => f.type === 'total_weight'));

        expect(totalReps?.fragments.find(f => f.type === 'total_reps')?.value).toBe(10);
        expect(totalDistance?.fragments.find(f => f.type === 'total_distance')?.value).toBe(100);
        // Weight volume for segment1: 10 reps * 20kg = 200kg
        expect(totalWeight?.fragments.find(f => f.type === 'total_weight')?.value).toBe(200);
    });

    it('should calculate metrics per second', () => {
        const process = new SummaryAnalyticsProcess();
        const now = new Date();

        const segment = new OutputStatement({
            outputType: 'segment',
            sourceBlockKey: 'block1',
            stackLevel: 1,
            timeSpan: new TimeSpan(now.getTime(), now.getTime() + 10000), // 10s
            fragments: [
                { fragmentType: FragmentType.Elapsed, type: 'elapsed', value: 10000, origin: 'runtime' },
                { fragmentType: FragmentType.Rep, type: 'rep', value: 20, origin: 'runtime' }
            ]
        });

        process.process(segment);
        const results = process.finalize();

        const repsPerSecond = results.find(o => o.fragments.some(f => f.type === 'reps_per_second'));
        expect(repsPerSecond?.fragments.find(f => f.type === 'reps_per_second')?.value).toBe(2);
    });

    it('should aggregate by effort', () => {
        const process = new SummaryAnalyticsProcess();
        const now = new Date();

        const hardSegment = new OutputStatement({
            outputType: 'segment',
            sourceBlockKey: 'block1',
            stackLevel: 1,
            timeSpan: new TimeSpan(now.getTime(), now.getTime() + 10000),
            fragments: [
                { fragmentType: FragmentType.Effort, type: 'effort', value: 'hard', origin: 'parser' },
                { fragmentType: FragmentType.Elapsed, type: 'elapsed', value: 10000, origin: 'runtime' },
                { fragmentType: FragmentType.Rep, type: 'rep', value: 10, origin: 'runtime' }
            ]
        });

        process.process(hardSegment);

        const results = process.finalize();

        const hardSummary = results.find(o => o.fragments.some(f => f.fragmentType === FragmentType.Effort && f.value === 'hard'));
        expect(hardSummary?.fragments.find(f => f.type === 'effort_reps')?.value).toBe(10);
    });
});
