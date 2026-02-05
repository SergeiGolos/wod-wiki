import { describe, it, expect } from 'bun:test';
import { ActionFragment } from '../runtime/compiler/fragments/ActionFragment';
import { DistanceFragment } from '../runtime/compiler/fragments/DistanceFragment';
import { EffortFragment } from '../runtime/compiler/fragments/EffortFragment';
import { IncrementFragment } from '../runtime/compiler/fragments/IncrementFragment';
import { GroupFragment } from '../runtime/compiler/fragments/GroupFragment';
import { RepFragment } from '../runtime/compiler/fragments/RepFragment';
import { ResistanceFragment } from '../runtime/compiler/fragments/ResistanceFragment';
import { RoundsFragment } from '../runtime/compiler/fragments/RoundsFragment';
import { TextFragment } from '../runtime/compiler/fragments/TextFragment';
import { TimerFragment } from '../runtime/compiler/fragments/TimerFragment';
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

    describe('All parser-created fragments should have origin: parser', () => {
        it('ActionFragment has origin: parser', () => {
            const fragment = new ActionFragment('test', mockMeta);
            expect(fragment.origin).toBe('parser');
        });

        it('DistanceFragment has origin: parser', () => {
            const fragment = new DistanceFragment(100, 'm', mockMeta);
            expect(fragment.origin).toBe('parser');
        });

        it('EffortFragment has origin: parser', () => {
            const fragment = new EffortFragment('Push-ups', mockMeta);
            expect(fragment.origin).toBe('parser');
        });

        it('IncrementFragment has origin: parser', () => {
            const fragment = new IncrementFragment('^', mockMeta);
            expect(fragment.origin).toBe('parser');
        });

        it('GroupFragment has origin: parser', () => {
            const fragment = new GroupFragment('round', '-', mockMeta);
            expect(fragment.origin).toBe('parser');
        });

        it('RepFragment has origin: parser', () => {
            const fragment = new RepFragment(10, mockMeta);
            expect(fragment.origin).toBe('parser');
        });

        it('ResistanceFragment has origin: parser', () => {
            const fragment = new ResistanceFragment(100, 'kg', mockMeta);
            expect(fragment.origin).toBe('parser');
        });

        it('RoundsFragment has origin: parser', () => {
            const fragment = new RoundsFragment(5, mockMeta);
            expect(fragment.origin).toBe('parser');
        });

        it('TextFragment has origin: parser', () => {
            const fragment = new TextFragment('Hello', 'h1', mockMeta);
            expect(fragment.origin).toBe('parser');
        });

        it('TimerFragment has origin: parser', () => {
            const fragment = new TimerFragment('5:00', mockMeta);
            expect(fragment.origin).toBe('parser');
        });
    });
});
