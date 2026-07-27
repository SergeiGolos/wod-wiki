import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import type { QueryResult } from '@/services/analytics/query';
import {
  WidgetFrame,
  QueryValue,
  WqlBars,
  WqlTimeseries,
  TopList,
  StackedBar,
  WqlEmptyState,
} from './index';

afterEach(cleanup);

const emptyResult: QueryResult = {
  parsed: { raw: 'sum:totalVolume{}', agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [] },
  series: [],
  stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
  matched: [],
};

const scalarResult: QueryResult = {
  parsed: { raw: 'sum:totalVolume{}', agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [] },
  series: [{ key: 'totalVolume', label: 'totalVolume', points: [{ ts: 1_700_000_000_000, value: 6000 }] }],
  stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
  matched: [],
  scalar: 6000,
};

const barsResult: QueryResult = {
  parsed: { raw: 'sum:totalReps{} by {effort}', agg: 'sum', metric: 'totalReps', filters: [], groupBy: ['effort'] },
  series: [
    { key: 'thruster', label: 'thruster', points: [{ ts: 1_700_000_000_000, value: 120 }] },
    { key: 'pull-up', label: 'pull-up', points: [{ ts: 1_700_000_000_000, value: 80 }] },
  ],
  stages: { selected: 2, buckets: 1, aggregated: 2, groups: 2 },
  matched: [],
};

const timeseriesResult: QueryResult = {
  parsed: { raw: 'sum:totalVolume{} by {week}.rollup(1w)', agg: 'sum', metric: 'totalVolume', filters: [], groupBy: ['week'], rollup: { size: 1, unit: 'w' } },
  series: [
    { key: 'totalVolume', label: 'totalVolume', points: [
      { ts: 1_700_000_000_000, value: 3000 },
      { ts: 1_700_604_800_000, value: 5000 },
    ] },
  ],
  stages: { selected: 2, buckets: 2, aggregated: 2, groups: 1 },
  matched: [],
};

const stackedResult: QueryResult = {
  parsed: { raw: 'sum:sessionLoad{} by {intensity}.rollup(1w)', agg: 'sum', metric: 'sessionLoad', filters: [], groupBy: ['intensity'], rollup: { size: 1, unit: 'w' } },
  series: [
    { key: 'low', label: 'low', points: [{ ts: 1_700_000_000_000, value: 100 }] },
    { key: 'high', label: 'high', points: [{ ts: 1_700_000_000_000, value: 300 }] },
  ],
  stages: { selected: 2, buckets: 1, aggregated: 2, groups: 2 },
  matched: [],
};

describe('analytics widgets', () => {
  it('WidgetFrame renders title and query', () => {
    render(
      <WidgetFrame title="Test" question="Why?" query="sum:totalVolume{}">
        <div data-testid="child" />
      </WidgetFrame>,
    );
    expect(screen.getByText('Test')).toBeDefined();
    expect(screen.getByText('Why?')).toBeDefined();
    expect(screen.getByText('sum:totalVolume{}')).toBeDefined();
  });

  it('QueryValue renders a scalar value', () => {
    render(
      <div className="h-36">
        <QueryValue result={scalarResult} unit="kg" label="total volume" />
      </div>,
    );
    expect(screen.getByText('6,000')).toBeDefined();
  });

  it('QueryValue applies threshold coloring', () => {
    render(
      <div className="h-36">
        <QueryValue
          result={scalarResult}
          unit=""
          label="risk"
          thresholds={{ green: [5000, 7000], red: [8000, 9999] }}
        />
      </div>,
    );
    const value = screen.getByText('6,000');
    expect(value.className.includes('text-success')).toBe(true);
  });

  it('WqlEmptyState renders empty message', () => {
    render(
      <div className="h-36">
        <WqlEmptyState result={emptyResult} />
      </div>,
    );
    expect(screen.getByText('No data for this range.')).toBeDefined();
  });

  it('WqlEmptyState renders parse error', () => {
    const errorResult: QueryResult = { ...emptyResult, parsed: { ...emptyResult.parsed, error: 'bad syntax' } };
    render(
      <div className="h-36">
        <WqlEmptyState result={errorResult} />
      </div>,
    );
    expect(screen.getByText(/bad syntax/)).toBeDefined();
  });

  it('TopList renders ranked rows', () => {
    render(
      <div className="h-36">
        <TopList result={barsResult} unit="reps" />
      </div>,
    );
    expect(screen.getByText('thruster')).toBeDefined();
    expect(screen.getByText('120 reps')).toBeDefined();
  });

  it('WqlBars renders categorical bars without crashing', () => {
    const { container } = render(
      <div className="h-56">
        <WqlBars result={barsResult} unit="reps" />
      </div>,
    );
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('WqlTimeseries renders a line chart without crashing', () => {
    const { container } = render(
      <div className="h-56">
        <WqlTimeseries result={timeseriesResult} unit="kg" />
      </div>,
    );
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('StackedBar renders a stacked bar chart without crashing', () => {
    const { container } = render(
      <div className="h-56">
        <StackedBar result={stackedResult} unit="AU" />
      </div>,
    );
    expect(container.querySelector('svg')).toBeDefined();
  });
});
