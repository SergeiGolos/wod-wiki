import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(cleanup);
import type { QueryResult } from '@/services/analytics/query';
import { GoalRings } from './GoalRings';

const mockResult: QueryResult = {
  parsed: {
    raw: 'max:calc.e1rm{effort:squat}',
    agg: 'max',
    metric: 'calc.e1rm',
    filters: [],
    groupBy: [],
    displayUnit: 'kg',
  },
  series: [
    {
      key: 'squat',
      label: 'Back Squat',
      points: [{ ts: 1700000000000, value: 204 }],
      unit: 'kg',
    },
  ],
  stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
  matched: [],
};

const multiSeriesResult: QueryResult = {
  ...mockResult,
  series: [
    {
      key: 'squat',
      label: 'Back Squat',
      points: [{ ts: 1700000000000, value: 204 }],
      unit: 'kg',
    },
    {
      key: 'deadlift',
      label: 'Deadlift',
      points: [{ ts: 1700000000000, value: 250 }],
      unit: 'kg',
    },
  ],
};

describe('GoalRings', () => {
  it('renders goal ring progress percentage with target param', () => {
    render(<GoalRings result={mockResult} params={['240']} label="Squat Goal" />);
    expect(screen.getByTestId('goal-rings')).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy();
    expect(screen.getByText('Squat Goal')).toBeTruthy();
    expect(screen.getByText('204 / 240 kg')).toBeTruthy();
  });

  it('renders 100% completion styling when target is reached or exceeded', () => {
    render(<GoalRings result={mockResult} params={['200']} />);
    expect(screen.getByText('102%')).toBeTruthy();
    expect(screen.getByText('204 / 200 kg')).toBeTruthy();
  });

  it('handles missing target gracefully without error', () => {
    render(<GoalRings result={mockResult} params={[]} />);
    expect(screen.getByTestId('goal-rings')).toBeTruthy();
    expect(screen.getByText('204')).toBeTruthy();
    expect(screen.getByText('204 kg')).toBeTruthy();
  });

  it('renders multiple goal rings for multi-series queries', () => {
    render(<GoalRings result={multiSeriesResult} params={['250']} />);
    const rings = screen.getAllByTestId('goal-ring-item');
    expect(rings.length).toBe(2);
    expect(screen.getByText('Back Squat')).toBeTruthy();
    expect(screen.getByText('Deadlift')).toBeTruthy();
    expect(screen.getByText('82%')).toBeTruthy(); // 204 / 250 = 81.6% -> 82%
    expect(screen.getByText('100%')).toBeTruthy(); // 250 / 250 = 100%
  });

  it('renders empty state when result has no series', () => {
    const emptyResult: QueryResult = { ...mockResult, series: [] };
    render(<GoalRings result={emptyResult} params={['200']} />);
    expect(screen.queryByTestId('goal-rings')).toBeNull();
  });
});
