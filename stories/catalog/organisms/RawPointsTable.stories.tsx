import type { Meta, StoryObj } from '@storybook/react';
import { RawPointsTable } from '../../../src/components/organisms/analytics/RawPointsTable';
import type { AnalyticsDataPoint } from '../../../src/types/storage';

const meta: Meta<typeof RawPointsTable> = {
  title: 'Organisms/Analytics/RawPointsTable',
  component: RawPointsTable,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof meta>;

const now = Date.now();

function point(id: number, overrides?: Partial<AnalyticsDataPoint>): AnalyticsDataPoint {
  return {
    id: `p-${id}`,
    noteId: 'note-1',
    segmentId: 's1',
    segmentVersion: 1,
    resultId: 'r1',
    type: 'totalVolume',
    metricKey: 'totalVolume',
    value: 1000 + id * 250,
    label: 'Total Volume',
    timestamp: now - id * 86_400_000,
    createdAt: now,
    unit: 'kg',
    discipline: 'strength',
    effortSlug: 'back-squat',
    ...overrides,
  };
}

export const Collapsed: Story = {
  args: {
    matched: [point(0), point(1), point(2)],
    displayUnit: 'kg',
  },
};

export const Many: Story = {
  args: {
    matched: Array.from({ length: 20 }, (_, i) => point(i)),
    displayUnit: 'kg',
  },
};
