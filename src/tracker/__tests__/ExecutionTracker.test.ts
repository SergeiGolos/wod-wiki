
import { describe, it, expect, beforeEach } from 'bun:test';
import { RuntimeReporter } from '../ExecutionTracker';
import { RuntimeMemory } from '../../runtime/RuntimeMemory';
import { IRuntimeBlock } from '../../runtime/IRuntimeBlock';
import { IBlockContext } from '../../runtime/IBlockContext';
import { EXECUTION_SPAN_TYPE } from '../../runtime/models/ExecutionSpan';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';
import { TrackedSpan } from '../../runtime/models/ExecutionSpan';

// Mock Block
const createMockBlock = (key: string, type: string = 'effort'): IRuntimeBlock => ({
    key: { toString: () => key, type: 'mock', id: key },
    sourceIds: [1],
    blockType: type,
    label: `Block ${key}`,
    context: {
        exerciseId: 'test-exercise'
    } as IBlockContext,
    mount: () => [],
    next: () => [],
    unmount: () => [],
    dispose: () => { },
    getBehavior: () => undefined
});

describe('RuntimeReporter', () => {
    let memory: RuntimeMemory;
    let tracker: RuntimeReporter;

    beforeEach(() => {
        memory = new RuntimeMemory();
        tracker = new RuntimeReporter(memory);
    });

    describe('Span Lifecycle', () => {
        it('should start a span and store it in memory', () => {
            const block = createMockBlock('block-1');
            const span = tracker.startSpan(block, null);

            expect(span).toBeDefined();
            expect(span.id).toContain('block-1');
            expect(span.status).toBe('active');
            expect(span.metrics.exerciseId).toBe('test-exercise');

            // Verify memory storage
            const stored = tracker.getActiveSpan('block-1');
            expect(stored).toBeDefined();
            expect(stored?.id).toBe(span.id);
        });

        it('should end a span and update status', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block, null);
            tracker.endSpan('block-1');

            const refs = memory.search({ type: EXECUTION_SPAN_TYPE, ownerId: 'block-1', id: null, visibility: null });
            const stored = memory.get(refs[0] as TypedMemoryReference<TrackedSpan>);

            expect(stored?.status).toBe('completed');
            expect(stored?.endTime).toBeDefined();
            expect(stored?.metrics.duration).toBeDefined();
        });

        it('should mark span as failed', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block, null);
            tracker.failSpan('block-1');

            const stored = tracker.getAllSpans()[0];
            expect(stored.status).toBe('failed');
        });
    });

    describe('Metrics', () => {
        it('should record numeric metrics', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block, null);

            tracker.recordNumericMetric('block-1', 'reps', 10, 'reps');

            const stored = tracker.getActiveSpan('block-1');
            expect(stored?.metrics.reps?.value).toBe(10);
            expect(stored?.metrics.reps?.unit).toBe('reps');
        });

        it('should record custom metrics', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block, null);

            tracker.recordMetric('block-1', 'custom_metric', 50, 'kg');

            const stored = tracker.getActiveSpan('block-1');
            expect(stored?.metrics.custom?.get('custom_metric')?.value).toBe(50);
        });

        it('should record rounds', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block, null);

            tracker.recordRound('block-1', 1, 5);

            const stored = tracker.getActiveSpan('block-1');
            expect(stored?.metrics.currentRound).toBe(1);
            expect(stored?.metrics.totalRounds).toBe(5);
        });
    });

    describe('Segments', () => {
        it('should manage time segments', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block, null);

            const segment = tracker.startSegment('block-1', 'work', 'Work Interval');
            expect(segment).toBeDefined();
            expect(segment?.type).toBe('work');

            const stored = tracker.getActiveSpan('block-1');
            expect(stored?.segments.length).toBe(1);
            expect(stored?.segments[0].endTime).toBeUndefined();

            tracker.endSegment('block-1');

            const storedAfterEnd = tracker.getActiveSpan('block-1');
            expect(storedAfterEnd?.segments[0].endTime).toBeDefined();
        });
    });

    describe('Debug Metadata', () => {
        it('should store debug logs', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block, null);

            tracker.addDebugLog('block-1', 'Test log message');

            const stored = tracker.getActiveSpan('block-1');
            expect(stored?.debugMetadata?.logs).toHaveLength(1);
            expect(stored?.debugMetadata?.logs?.[0]).toContain('Test log message');
        });

        it('should add debug tags', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block, null);

            tracker.addDebugTag('block-1', 'test-tag');

            const stored = tracker.getActiveSpan('block-1');
            expect(stored?.debugMetadata?.tags).toContain('test-tag');
        });
    });
});
