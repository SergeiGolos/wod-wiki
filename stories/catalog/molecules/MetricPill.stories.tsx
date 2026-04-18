/**
 * DesignSystem / Molecules / MetricPill
 *
 * Compact badge that displays a single IMetric value with colour-coded
 * type and a special dashed border for user-override origins.
 */


import type { Meta, StoryObj } from '@storybook/react';
import { MetricPill } from '@/components/review-grid/MetricPill';
import { MetricType, type IMetric } from '@/core/models/Metric';
import { FIXTURE_METRICS } from '../../_shared/fixtures';

const meta: Meta<typeof MetricPill> = {
  title: 'catalog/molecules/MetricPill',
  component: MetricPill,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-6 bg-background rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const pill = (metric: IMetric) => <MetricPill metric={metric} />;

export const ElapsedRuntime: Story = {
  name: 'Elapsed — runtime origin (2:12)',
  render: () => pill(FIXTURE_METRICS[0]),
};

export const RepsCompiler: Story = {
  name: 'Reps — compiler origin (21 reps)',
  render: () => pill(FIXTURE_METRICS[1]),
};

export const WeightParser: Story = {
  name: 'Weight — parser origin (95 lb)',
  render: () => pill(FIXTURE_METRICS[2]),
};

export const DurationParser: Story = {
  name: 'Duration — parser origin (3:00)',
  render: () => pill(FIXTURE_METRICS[3]),
};

export const UserOverride: Story = {
  name: 'Elapsed — user override (dashed border + italic)',
  render: () => pill(FIXTURE_METRICS[4]),
};

export const AllVariants: Story = {
  name: 'All five variants side-by-side',
  render: () => (
    <div className="flex flex-wrap gap-2">
      {FIXTURE_METRICS.map((m, i) => (
        <MetricPill key={i} metric={m} />
      ))}
    </div>
  ),
};

export const CustomMetricTypes: Story = {
  name: 'Custom / derived metric types',
  render: () => {
    const custom: IMetric[] = [
      { type: 'speed', value: 12.4, unit: 'km/h', origin: 'analyzed' },
      { type: 'pace', value: '4:50', unit: '/km', origin: 'analyzed' },
      { type: 'power', value: 250, unit: 'W', origin: 'analyzed' },
      { type: 'distance', value: 400, unit: 'm', origin: 'compiler' },
      { type: MetricType.Duration, value: 300_000, unit: 's', origin: 'parser' },
    ];
    return (
      <div className="flex flex-wrap gap-2">
        {custom.map((m, i) => (
          <MetricPill key={i} metric={m} />
        ))}
      </div>
    );
  },
};
