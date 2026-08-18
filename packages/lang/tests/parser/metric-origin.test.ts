import { describe, it, expect } from 'vitest';
import { ActionMetric } from '../../src/runtime/compiler/metrics/ActionMetric';
import { DistanceMetric } from '../../src/runtime/compiler/metrics/DistanceMetric';
import { EffortMetric } from '../../src/runtime/compiler/metrics/EffortMetric';
import { IncrementMetric } from '../../src/runtime/compiler/metrics/IncrementMetric';
import { GroupMetric } from '../../src/runtime/compiler/metrics/GroupMetric';
import { RepMetric } from '../../src/runtime/compiler/metrics/RepMetric';
import { ResistanceMetric } from '../../src/runtime/compiler/metrics/ResistanceMetric';
import { RoundsMetric } from '../../src/runtime/compiler/metrics/RoundsMetric';
import { TextMetric } from '../../src/runtime/compiler/metrics/TextMetric';
import { CodeMetadata } from '@wod-wiki/core';

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
    });
});
