import { describe, expect, it, afterEach } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import type { RowsQueryResult, Segment } from '@bitcobblers/wod-wiki-engine';
import { RowsTable } from '../src';

afterEach(cleanup);

const mockRowsResult: RowsQueryResult = {
  parsed: { family: 'rows', raw: 'rows:{result:test-run-1}', filters: [{ key: 'result', negate: false, values: [{ value: 'test-run-1', wildcard: false }] }] },
  runs: [
    {
      result: {
        id: 'test-run-1',
        noteId: 'note-1',
        createdAt: 1700000000000,
        pageId: 'note-1',
        origin: 'journal',
        data: {
          startTime: 1700000000000,
          endTime: 1700000600000,
          duration: 600000,
          completed: true,
          logs: [],
        },
      },
      logs: [],
    },
  ],
};

describe('RowsTable with decoupled segment grid renderer', () => {
  it('renders default plain segment table fallback when renderSegments is not passed', () => {
    render(<RowsTable result={mockRowsResult} />);
    expect(screen.getByText('No segmented output recorded for this run.')).toBeDefined();
  });

  it('renders custom segment grid when renderSegments prop is provided', () => {
    const customRenderer = (_segments: Segment[]) => (
      <div data-testid="custom-review-grid">Custom Segment Grid</div>
    );

    render(
      <RowsTable
        result={mockRowsResult}
        renderSegments={customRenderer}
      />,
    );

    expect(screen.getByTestId('custom-review-grid')).toBeDefined();
    expect(screen.getByText('Custom Segment Grid')).toBeDefined();
  });
});
