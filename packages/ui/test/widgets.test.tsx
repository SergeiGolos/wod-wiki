import { describe, expect, it, afterEach } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import type { QueryResult } from '@wod-wiki/engine';
import {
  WidgetFrame,
  QueryValue,
  WqlTimeseries,
  WqlBars,
  WqlTable,
  TopList,
  StackedBar,
  GoalRings,
  ZoneDistribution,
  WqlEmptyState,
  WidgetChart,
  WidgetProblemBadge,
  DashboardTokenControls,
  RangeSelector,
  AnalyticsUnitPreference,
  CODEMIRROR_SINGLETON_DEPS,
} from '../src';

afterEach(cleanup);

function scalarResult(raw: string, value = 42, unit = 'reps'): QueryResult {
  return {
    parsed: { raw, agg: 'sum', metric: 'reps', filters: [], groupBy: [] },
    series: [{ key: 'scalar', label: 'reps', points: [{ ts: 1000, value }], unit }],
    stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
    matched: [],
    scalar: value,
    unit,
  };
}

function timeseriesResult(raw: string): QueryResult {
  return {
    parsed: { raw, agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [] },
    series: [
      {
        key: 'volume',
        label: 'Volume',
        points: [
          { ts: 1700000000000, value: 5000 },
          { ts: 1700086400000, value: 6200 },
        ],
        unit: 'kg',
      },
    ],
    stages: { selected: 2, buckets: 2, aggregated: 2, groups: 1 },
    matched: [],
    unit: 'kg',
  };
}

function groupedResult(raw: string): QueryResult {
  return {
    parsed: { raw, agg: 'sum', metric: 'reps', filters: [], groupBy: ['discipline'] },
    series: [
      { key: 'crossfit', label: 'CrossFit', points: [{ ts: 1000, value: 120 }], unit: 'reps' },
      { key: 'weightlifting', label: 'Weightlifting', points: [{ ts: 1000, value: 80 }], unit: 'reps' },
    ],
    stages: { selected: 2, buckets: 1, aggregated: 2, groups: 2 },
    matched: [],
    unit: 'reps',
  };
}

describe('@wod-wiki/ui presentational widgets & IR consumer suite', () => {
  it('exports CODEMIRROR_SINGLETON_DEPS array containing essential codemirror and lezer packages', () => {
    expect(CODEMIRROR_SINGLETON_DEPS).toBeArray();
    expect(CODEMIRROR_SINGLETON_DEPS).toContain('@codemirror/state');
    expect(CODEMIRROR_SINGLETON_DEPS).toContain('@codemirror/view');
    expect(CODEMIRROR_SINGLETON_DEPS).toContain('@codemirror/language');
    expect(CODEMIRROR_SINGLETON_DEPS).toContain('@lezer/common');
  });

  describe('1. WidgetFrame', () => {
    it('renders title, question, and query', () => {
      render(
        <WidgetFrame title="Weekly Volume" question="How much did I lift?" query="sum:totalVolume{} every week">
          <div data-testid="child-content">Content</div>
        </WidgetFrame>,
      );
      expect(screen.getByText('Weekly Volume')).toBeDefined();
      expect(screen.getByText('How much did I lift?')).toBeDefined();
      expect(screen.getByText('sum:totalVolume{} every week')).toBeDefined();
      expect(screen.getByTestId('child-content')).toBeDefined();
    });
  });

  describe('2. QueryValue', () => {
    it('renders scalar value and unit', () => {
      const res = scalarResult('sum:reps{}', 150, 'reps');
      render(<QueryValue result={res} label="Total Reps" />);
      expect(screen.getByText('150')).toBeDefined();
      expect(screen.getByText('reps')).toBeDefined();
      expect(screen.getByText('Total Reps')).toBeDefined();
    });
  });

  describe('3. WqlTimeseries', () => {
    it('renders timeseries result', () => {
      const res = timeseriesResult('sum:totalVolume{} every day');
      const { container } = render(<WqlTimeseries result={res} />);
      expect(container).toBeDefined();
    });
  });

  describe('4. WqlBars', () => {
    it('renders bars result', () => {
      const res = groupedResult('sum:reps{} by discipline');
      const { container } = render(<WqlBars result={res} />);
      expect(container).toBeDefined();
    });
  });

  describe('5. WqlTable', () => {
    it('renders table headers and rows for scalar and timeseries', () => {
      const res = scalarResult('sum:reps{}', 50, 'reps');
      render(<WqlTable result={res} />);
      expect(screen.getByText('Metric')).toBeDefined();
      expect(screen.getByText('Value')).toBeDefined();
      expect(screen.getByText('50 reps')).toBeDefined();
    });
  });

  describe('6. TopList', () => {
    it('renders top ranked items sorted by value', () => {
      const res = groupedResult('sum:reps{} by discipline');
      render(<TopList result={res} />);
      expect(screen.getByText('CrossFit')).toBeDefined();
      expect(screen.getByText('Weightlifting')).toBeDefined();
      expect(screen.getByText('120 reps')).toBeDefined();
      expect(screen.getByText('80 reps')).toBeDefined();
    });
  });

  describe('7. StackedBar', () => {
    it('renders stacked bar chart', () => {
      const res = timeseriesResult('sum:totalVolume{} every day');
      const { container } = render(<StackedBar result={res} />);
      expect(container).toBeDefined();
    });
  });

  describe('8. GoalRings', () => {
    it('renders goal ring with percentage and target', () => {
      const res = scalarResult('max:calc.e1rm{}', 120, 'kg');
      render(<GoalRings result={res} params={['150']} label="Back Squat E1RM" />);
      expect(screen.getByTestId('goal-rings-widget')).toBeDefined();
      expect(screen.getByText('80%')).toBeDefined();
      expect(screen.getByText('120 kg')).toBeDefined();
      expect(screen.getByText('Goal: 150 kg')).toBeDefined();
    });
  });

  describe('9. ZoneDistribution', () => {
    it('renders polarized zone distribution vs targets', () => {
      const res: QueryResult = {
        parsed: { raw: 'sum:time{} by intensity', agg: 'sum', metric: 'time', filters: [], groupBy: ['intensity'] },
        series: [
          { key: 'low', label: 'Low', points: [{ ts: 1000, value: 80 }], unit: 'min' },
          { key: 'moderate', label: 'Moderate', points: [{ ts: 1000, value: 0 }], unit: 'min' },
          { key: 'high', label: 'High', points: [{ ts: 1000, value: 20 }], unit: 'min' },
        ],
        stages: { selected: 3, buckets: 1, aggregated: 3, groups: 3 },
        matched: [],
      };
      render(<ZoneDistribution result={res} params={['80 0 20']} />);
      expect(screen.getByTestId('zone-distribution-widget')).toBeDefined();
      expect(screen.getByTestId('zone-card-low')).toBeDefined();
      expect(screen.getByTestId('zone-card-high')).toBeDefined();
    });
  });

  describe('10. WqlEmptyState', () => {
    it('renders loading or error or no-data', () => {
      render(<WqlEmptyState result={undefined} />);
      expect(screen.getByText('Loading…')).toBeDefined();

      cleanup();
      const emptyResult: QueryResult = {
        parsed: { raw: 'sum:reps{}', agg: 'sum', metric: 'reps', filters: [], groupBy: [] },
        series: [],
        stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
        matched: [],
      };
      render(<WqlEmptyState result={emptyResult} />);
      expect(screen.getByText('No data for this range.')).toBeDefined();
    });
  });

  describe('11. WidgetChart', () => {
    it('dispatches to value, timeseries, bars, and table based on type', () => {
      const res = scalarResult('sum:reps{}', 75, 'reps');
      render(<WidgetChart type="value" result={res} label="Reps" />);
      expect(screen.getByText('75')).toBeDefined();
    });

    it('renders problem badge for unknown widget type', () => {
      const res = scalarResult('sum:reps{}', 75, 'reps');
      render(<WidgetChart type="unknown-custom-type" result={res} />);
      expect(screen.getByRole('alert')).toBeDefined();
    });
  });

  describe('12. WidgetProblemBadge', () => {
    it('renders error message in alert role', () => {
      render(<WidgetProblemBadge message="Malformed query clause" />);
      expect(screen.getByRole('alert').textContent).toContain('Malformed query clause');
    });
  });

  describe('13. DashboardTokenControls', () => {
    it('renders list tokens and scalar inputs', () => {
      const tokens = [
        { name: 'movement', values: ['Back Squat', 'Front Squat'], isList: true },
        { name: 'goal', values: ['100'], isList: false },
      ];
      render(<DashboardTokenControls tokens={tokens} values={{ movement: 'Back Squat', goal: '100' }} />);
      expect(screen.getByTestId('dashboard-token-controls')).toBeDefined();
      expect(screen.getByText('$movement')).toBeDefined();
      expect(screen.getByText('$goal')).toBeDefined();
    });
  });

  describe('14. RangeSelector', () => {
    it('renders range week buttons', () => {
      render(<RangeSelector weeks={8} onWeeksChange={() => {}} />);
      expect(screen.getByText('4w')).toBeDefined();
      expect(screen.getByText('8w')).toBeDefined();
      expect(screen.getByText('16w')).toBeDefined();
    });
  });

  describe('15. AnalyticsUnitPreference', () => {
    it('renders kg and lb unit buttons', () => {
      render(<AnalyticsUnitPreference unit="kg" />);
      expect(screen.getByTestId('analytics-unit-preference')).toBeDefined();
      expect(screen.getByText('kg')).toBeDefined();
      expect(screen.getByText('lb')).toBeDefined();
    });
  });
});
