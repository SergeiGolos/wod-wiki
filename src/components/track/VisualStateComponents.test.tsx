import { describe, it, expect, beforeEach } from 'bun:test';
import { getOutputsForHistoryBlock } from './VisualStateComponents';
import { OutputStatement, OutputStatementType } from '@/core/models/OutputStatement';
import { TimeSpan } from '@/runtime/models/TimeSpan';

function makeOutput(type: OutputStatementType, stackLevel: number): OutputStatement {
    return new OutputStatement({
        outputType: type,
        timeSpan: new TimeSpan(0, 60000),
        sourceBlockKey: `block-${stackLevel}`,
        stackLevel,
        metrics: [],
    });
}

describe('getOutputsForHistoryBlock', () => {
    beforeEach(() => {
        OutputStatement.resetIdCounter();
    });

    it('assigns depth-1 outputs to root when only root is visible', () => {
        const outputs = [
            makeOutput('segment', 1),
        ];
        // Only root visible (totalVisible = 1)
        const result = getOutputsForHistoryBlock(outputs, 0, 1);
        expect(result).toHaveLength(1);
        expect(result[0].stackLevel).toBe(1);
    });

    it('bubbles up orphaned deep outputs to the deepest visible ancestor', () => {
        const outputs = [
            makeOutput('segment', 1),
            makeOutput('segment', 2),
            makeOutput('segment', 3),
        ];
        // Only root visible (totalVisible = 1)
        const rootHistory = getOutputsForHistoryBlock(outputs, 0, 1);
        expect(rootHistory).toHaveLength(3);
        expect(rootHistory.map(o => o.stackLevel)).toEqual([1, 2, 3]);
    });

    it('shows immediate children under their parent when stack is full', () => {
        const outputs = [
            makeOutput('segment', 1),
            makeOutput('segment', 2),
            makeOutput('segment', 3),
        ];
        // Full stack visible: root + child + leaf (totalVisible = 3)
        const rootHistory = getOutputsForHistoryBlock(outputs, 0, 3);
        expect(rootHistory.map(o => o.stackLevel)).toEqual([1]);

        const childHistory = getOutputsForHistoryBlock(outputs, 1, 3);
        expect(childHistory.map(o => o.stackLevel)).toEqual([2]);

        const leafHistory = getOutputsForHistoryBlock(outputs, 2, 3);
        expect(leafHistory.map(o => o.stackLevel)).toEqual([3]);
    });

    it('handles partially collapsed stack (intermediate block popped)', () => {
        const outputs = [
            makeOutput('segment', 1), // child output
            makeOutput('segment', 2), // leaf output (child was popped)
        ];
        // Root + leaf visible, child was popped (totalVisible = 2)
        const rootHistory = getOutputsForHistoryBlock(outputs, 0, 2);
        expect(rootHistory.map(o => o.stackLevel)).toEqual([1]);

        const leafHistory = getOutputsForHistoryBlock(outputs, 1, 2);
        expect(leafHistory.map(o => o.stackLevel)).toEqual([2]);
    });

    it('ignores non-segment outputs', () => {
        const outputs = [
            makeOutput('system', 1),
            makeOutput('segment', 1),
            makeOutput('event', 2),
        ];
        const result = getOutputsForHistoryBlock(outputs, 0, 1);
        expect(result).toHaveLength(1);
        expect(result[0].outputType).toBe('segment');
    });

    it('ignores root-level outputs (stackLevel 0)', () => {
        const outputs = [
            makeOutput('segment', 0),
        ];
        const result = getOutputsForHistoryBlock(outputs, 0, 1);
        expect(result).toHaveLength(0);
    });

    it('returns empty array when no outputs match', () => {
        const outputs: OutputStatement[] = [];
        const result = getOutputsForHistoryBlock(outputs, 0, 1);
        expect(result).toHaveLength(0);
    });
});
