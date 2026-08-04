import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(cleanup);
import type { QueryResult } from '@/services/analytics/query';
import { ZoneDistribution } from './ZoneDistribution';

const zoneResult: QueryResult = {
  parsed: {
    raw: 'sum:sessionLoad{} by {intensity}',
    agg: 'sum',
    metric: 'sessionLoad',
    filters: [],
    groupBy: ['intensity'],
  },
  series: [
    {
      key: 'low',
      label: 'low',
      points: [{ ts: 1700000000000, value: 800 }],
    },
    {
      key: 'moderate',
      label: 'moderate',
      points: [{ ts: 1700000000000, value: 50 }],
    },
    {
      key: 'high',
      label: 'high',
      points: [{ ts: 1700000000000, value: 150 }],
    },
  ],
  stages: { selected: 1, buckets: 1, aggregated: 3, groups: 3 },
  matched: [],
};

describe('ZoneDistribution', () => {
  it('renders zone distribution with default polarized 80/0/20 targets', () => {
    render(<ZoneDistribution result={zoneResult} />);
    expect(screen.getByTestId('zone-distribution')).toBeTruthy();
    expect(screen.getByText('Distribution: 80 / 5 / 15%')).toBeTruthy();
    expect(screen.getByText('Target: 80 / 0 / 20%')).toBeTruthy();
    expect(screen.getByText('Low')).toBeTruthy();
    expect(screen.getByText('Moderate')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
  });
  it('renders custom targets from params', () => {
    render(<ZoneDistribution result={zoneResult} params={['75', '10', '15']} />);
    expect(screen.getByText('Target: 75 / 10 / 15%')).toBeTruthy();
  });

  it('handles 2 params as polarized low and high targets', () => {
    render(<ZoneDistribution result={zoneResult} params={['85', '15']} />);
    expect(screen.getByText('Target: 85 / 0 / 15%')).toBeTruthy();
  });

  it('falls back to default targets when non-numeric params are provided', () => {
    render(<ZoneDistribution result={zoneResult} params={['invalid', 'bogus', 'xyz']} />);
    expect(screen.getByText('Target: 80 / 0 / 20%')).toBeTruthy();
  });
  it('renders empty state when result has no series', () => {
    const emptyResult: QueryResult = { ...zoneResult, series: [] };
    render(<ZoneDistribution result={emptyResult} />);
    expect(screen.queryByTestId('zone-distribution')).toBeNull();
  });
});
