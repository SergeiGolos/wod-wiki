import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';

mock.module('@/hooks/useRuntimeTimer', () => ({
  useWorkoutTracker: () => ({
    metrics: {
      'session-totals': {
        totalLoad: { value: 1200, unit: 'kg' },
        calculated: { value: 420, unit: 'pts' },
        custom_metric: { value: 'Zone 2', unit: '' },
      },
    },
  }),
}));

const { MetricTrackerCard } = await import('./MetricTrackerCard');

describe('MetricTrackerCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('humanizes unknown session-total keys while keeping custom and calculated metrics visible', () => {
    render(<MetricTrackerCard />);

    expect(screen.getByText('Total Load')).toBeDefined();
    expect(screen.getByText('Calculated')).toBeDefined();
    expect(screen.getByText('Custom Metric')).toBeDefined();
    expect(screen.getByText('1200')).toBeDefined();
    expect(screen.getByText('420')).toBeDefined();
    expect(screen.getByText('Zone 2')).toBeDefined();
  });
});
