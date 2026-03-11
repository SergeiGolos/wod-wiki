import { describe, it, expect } from 'bun:test';
import { ActionMetric } from '../runtime/compiler/metrics/ActionMetric';
import { DistanceMetric } from '../runtime/compiler/metrics/DistanceMetric';
import { EffortMetric } from '../runtime/compiler/metrics/EffortMetric';
import { IncrementMetric } from '../runtime/compiler/metrics/IncrementMetric';
import { GroupMetric } from '../runtime/compiler/metrics/GroupMetric';
import { RepMetric } from '../runtime/compiler/metrics/RepMetric';
import { ResistanceMetric } from '../runtime/compiler/metrics/ResistanceMetric';
import { RoundsMetric } from '../runtime/compiler/metrics/RoundsMetric';
import { TextMetric } from '../runtime/compiler/metrics/TextMetric';
import { TimerMetric } from '../runtime/compiler/metrics/TimerMetric';
import { CodeMetadata } from '../core/models/CodeMetadata';

describe('Fragment Origin Marking', () => {
    const mockMeta: CodeMetadata = {
        line: 1,
        columnStart: 0,
        columnEnd: 10,
        startOffset: 0,
        endOffset: 10,
        length: 10,
        raw: 'test'
    };

    describe('All parser-created metric should have origin: parser', () => {
        it('ActionMetric has origin: parser', () => {
            const metric = new ActionMetric('test', mockMeta);
            expect(metric.origin).toBe('parser');
        });

        it('DistanceMetric has origin: parser', () => {
            const metric = new DistanceMetric(100, 'm', mockMeta);
            expect(metric.origin).toBe('parser');
        });

        it('EffortMetric has origin: parser', () => {
            const metric = new EffortMetric('Push-ups', mockMeta);
            expect(metric.origin).toBe('parser');
        });

        it('IncrementMetric has origin: parser', () => {
            const metric = new IncrementMetric('^', mockMeta);
            expect(metric.origin).toBe('parser');
        });

        it('GroupMetric has origin: parser', () => {
            const metric = new GroupMetric('round', '-', mockMeta);
            expect(metric.origin).toBe('parser');
        });

        it('RepMetric has origin: parser', () => {
            const metric = new RepMetric(10, mockMeta);
            expect(metric.origin).toBe('parser');
        });

        it('ResistanceMetric has origin: parser', () => {
            const metric = new ResistanceMetric(100, 'kg', mockMeta);
            expect(metric.origin).toBe('parser');
        });

        it('RoundsMetric has origin: parser', () => {
            const metric = new RoundsMetric(5, mockMeta);
            expect(metric.origin).toBe('parser');
        });

        it('TextMetric has origin: parser', () => {
            const metric = new TextMetric('Hello', 'h1', mockMeta);
            expect(metric.origin).toBe('parser');
        });

        it('TimerMetric has origin: parser', () => {
            const metric = new TimerMetric('5:00', mockMeta);
            expect(metric.origin).toBe('parser');
        });
    });
});
