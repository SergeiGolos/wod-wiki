
import { describe, it, expect, beforeEach } from 'bun:test';
import { RuntimeReporter } from '../ExecutionTracker';
import { RuntimeMemory } from '../../runtime/RuntimeMemory';
import { IRuntimeBlock } from '../../runtime/contracts/IRuntimeBlock';
import { IBlockContext } from '../../runtime/IBlockContext';
import { RUNTIME_SPAN_TYPE, RuntimeSpan } from '../../runtime/models/RuntimeSpan';
import { TypedMemoryReference } from '../../runtime/contracts/IMemoryReference';
import { FragmentType } from '../../core/models/CodeFragment';

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
    getBehavior: () => undefined,
    fragments: [[{ type: 'test', fragmentType: FragmentType.Text, value: 'Initial', image: 'Initial' }]]
} as any);

describe('RuntimeReporter (RuntimeSpan version)', () => {
    let memory: RuntimeMemory;
    let tracker: RuntimeReporter;

    beforeEach(() => {
        memory = new RuntimeMemory();
        tracker = new RuntimeReporter(memory);
    });

    describe('Span Lifecycle', () => {
        it('should start a span and store it in memory', () => {
            const block = createMockBlock('block-1');
            const span = tracker.startSpan(block);

            expect(span).toBeDefined();
            expect(span.blockId).toBe('block-1');
            expect(span.isActive()).toBe(true);

            // Verify memory storage
            const stored = tracker.getActiveSpan('block-1');
            expect(stored).toBeDefined();
            expect(stored?.id).toBe(span.id);
        });

        it('should end a span and update status', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block);
            tracker.endSpan('block-1');

            const refs = memory.search({ type: RUNTIME_SPAN_TYPE, ownerId: 'block-1', id: null, visibility: null });
            const stored = memory.get(refs[0] as TypedMemoryReference<RuntimeSpan>);

            expect(stored?.isActive()).toBe(false);
            expect(stored?.spans[0].ended).toBeDefined();
        });

        it('should mark span as failed', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block);
            tracker.failSpan('block-1');

            const stored = tracker.getAllSpans()[0];
            expect(stored.status).toBe('failed');
            expect(stored.isActive()).toBe(false);
        });
    });

    describe('Metrics (Fragments)', () => {
        it('should record numeric metrics as fragments', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block);

            tracker.recordNumericMetric('block-1', 'reps', 10, 'reps');

            const stored = tracker.getActiveSpan('block-1');
            const repsFragment = stored?.fragments[stored.fragments.length - 1].find(f => f.type === 'reps');
            expect(repsFragment?.value).toBe(10);
        });

        it('should record rounds as fragments', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block);

            tracker.recordRound('block-1', 1, 5);

            const stored = tracker.getActiveSpan('block-1');
            const roundFragment = stored?.fragments[stored.fragments.length - 1].find(f => f.type === 'rounds');
            expect(roundFragment?.value).toBe(1);
            expect(roundFragment?.image).toBe('1/5');
        });
    });

    describe('Segments (Effort Fragments)', () => {
        it('should manage time segments as fragments', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block);

            tracker.startSegment('block-1', 'work', 'Work Interval');

            const stored = tracker.getActiveSpan('block-1');
            const effortFragment = stored?.fragments[stored.fragments.length - 1].find(f => f.fragmentType === FragmentType.Effort);
            expect(effortFragment?.value).toBe('Work Interval');
        });
    });

    describe('Metadata', () => {
        it('should store debug logs', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block);

            tracker.addDebugLog('block-1', 'Test log message');

            const stored = tracker.getActiveSpan('block-1');
            expect(stored?.metadata.logs).toHaveLength(1);
            expect(stored?.metadata.logs?.[0]).toContain('Test log message');
        });

        it('should add debug tags', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block);

            tracker.addDebugTag('block-1', 'test-tag');

            const stored = tracker.getActiveSpan('block-1');
            expect(stored?.metadata.tags).toContain('test-tag');
        });

        it('should set debug context', () => {
            const block = createMockBlock('block-1');
            tracker.startSpan(block);

            tracker.setDebugContext('block-1', { userId: '123' });

            const stored = tracker.getActiveSpan('block-1');
            expect(stored?.metadata.context.userId).toBe('123');
        });
    });
});
