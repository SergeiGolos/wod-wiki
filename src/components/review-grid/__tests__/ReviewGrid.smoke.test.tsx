import React from 'react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ReviewGrid } from '../ReviewGrid';
import { DebugModeProvider } from '@/components/layout/DebugModeContext';
import type { Segment } from '@/core/models/AnalyticsModels';
import type { AnalyticsGroup } from '@/core/models/AnalyticsModels';
import { MetricType, type IMetric } from '@/core/models/Metric';
import { MetricContainer } from '@/core/models/MetricContainer';

function makeMetric(type: MetricType, value: unknown, image?: string): IMetric {
  return {
    type,
    value,
    image,
    origin: 'runtime',
  };
}

function makeMetrics(id: string, metrics: IMetric[]): MetricContainer {
  return new MetricContainer(metrics, id);
}

function makeSegment(overrides: Partial<Segment> & Pick<Segment, 'id' | 'name'>): Segment {
  return {
    id: overrides.id,
    name: overrides.name,
    type: overrides.type ?? 'segment',
    startTime: overrides.startTime ?? 0,
    endTime: overrides.endTime ?? 60,
    absoluteStartTime: overrides.absoluteStartTime ?? 1718442000000,
    duration: overrides.duration,
    elapsed: overrides.elapsed ?? 60,
    total: overrides.total ?? 60,
    parentId: overrides.parentId ?? null,
    depth: overrides.depth ?? 0,
    metric: overrides.metric ?? {},
    lane: overrides.lane ?? 0,
    spans: overrides.spans ?? [{ started: 0, ended: overrides.elapsed ?? 60 }],
    metrics: overrides.metrics,
  };
}

function renderReviewGrid(segments: Segment[]) {
  const onSelectSegment = mock(() => {});
  const groups: AnalyticsGroup[] = [];

  const view = render(
    <DebugModeProvider>
      <ReviewGrid
        runtime={null}
        segments={segments}
        selectedSegmentIds={new Set()}
        onSelectSegment={onSelectSegment}
        groups={groups}
      />
    </DebugModeProvider>,
  );

  return { ...view, onSelectSegment };
}

const fixtureSegments: Segment[] = [
  makeSegment({
    id: 1,
    name: 'thrusters-1',
    elapsed: 45,
    total: 45,
    metrics: makeMetrics('segment-1', [
      makeMetric(MetricType.Text, 'Thrusters'),
      makeMetric(MetricType.Rep, 21),
      makeMetric(MetricType.Resistance, 95, '95 lb'),
    ]),
  }),
  makeSegment({
    id: 2,
    name: 'pull-ups-1',
    elapsed: 90,
    total: 90,
    metrics: makeMetrics('segment-2', [
      makeMetric(MetricType.Text, 'Pull-ups'),
      makeMetric(MetricType.Rep, 21),
    ]),
  }),
  makeSegment({
    id: 3,
    name: 'thrusters-2',
    elapsed: 135,
    total: 135,
    metrics: makeMetrics('segment-3', [
      makeMetric(MetricType.Text, 'Thrusters'),
      makeMetric(MetricType.Rep, 15),
      makeMetric(MetricType.Resistance, 95, '95 lb'),
    ]),
  }),
];

describe('ReviewGrid smoke', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the empty state defensively', () => {
    renderReviewGrid([]);

    expect(
      screen.getByText('No output data available. Run a session to see results.'),
    ).toBeDefined();
    expect(screen.getByText('0 rows')).toBeDefined();
  });

  it('supports search, sort, graph toggle, and row selection in the completed state', () => {
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const [first] = args;
      if (
        typeof first === 'string' &&
        first.includes('The width(-1) and height(-1) of chart should be greater than 0')
      ) {
        return;
      }
      originalConsoleError(...args);
    };

    try {
      const { container, onSelectSegment } = renderReviewGrid(fixtureSegments);

      const getBodyRows = () => Array.from(container.querySelectorAll('tbody tr'));

      expect(getBodyRows()).toHaveLength(3);
      expect(screen.getByText('3 rows')).toBeDefined();

      const searchInput = screen.getByPlaceholderText('MQL (not current implement)');
      fireEvent.change(searchInput, { target: { value: 'Pull-ups' } });

      expect(getBodyRows()).toHaveLength(1);
      expect(screen.getAllByText('1 / 3 rows').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Pull-ups').length).toBeGreaterThan(0);

      fireEvent.change(searchInput, { target: { value: '' } });
      expect(getBodyRows()).toHaveLength(3);

      const repsHeaderLabel = screen.getByText('Reps');
      const repsHeader = repsHeaderLabel.closest('th');
      expect(repsHeader).toBeTruthy();
      if (!repsHeader) throw new Error('Expected Reps header');

      fireEvent.click(repsHeader);
      expect(within(repsHeader).getByText('▲')).toBeDefined();

      const graphToggle = within(repsHeader).getByTitle('Add to graph');
      fireEvent.click(graphToggle);
      expect(screen.getByText(/Graph — Reps/i)).toBeDefined();

      const firstRow = getBodyRows()[0];
      fireEvent.click(firstRow);
      expect(onSelectSegment.mock.calls.length).toBe(1);
      expect(onSelectSegment.mock.calls[0][0]).toBe(3);
    } finally {
      console.error = originalConsoleError;
    }
  });
});
