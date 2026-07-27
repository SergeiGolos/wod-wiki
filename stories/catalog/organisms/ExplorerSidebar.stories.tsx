import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ExplorerSidebar } from '../../../src/components/organisms/analytics/ExplorerSidebar';

const meta: Meta<typeof ExplorerSidebar> = {
  title: 'Organisms/Analytics/ExplorerSidebar',
  component: ExplorerSidebar,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof meta>;

const METRIC_KEYS = ['totalVolume', 'tis', 'sessionLoad', 'totalReps'];
const TAG_KEYS = ['effort', 'discipline', 'intensity', 'tags', 'note'];

function InteractiveHarness() {
  const [query, setQuery] = useState('sum:totalVolume{discipline:strength} by {week}.rollup(1w)');
  return (
    <div className="flex gap-4">
      <ExplorerSidebar
        metricKeys={METRIC_KEYS}
        tagKeys={TAG_KEYS}
        query={query}
        onSelectMetric={(m) => setQuery(`sum:${m}{discipline:strength} by {week}.rollup(1w)`)}
      />
      <div className="text-xs font-mono text-muted-foreground">{query}</div>
    </div>
  );
}

export const Static: Story = {
  args: {
    metricKeys: METRIC_KEYS,
    tagKeys: TAG_KEYS,
    query: 'sum:totalVolume{discipline:strength} by {week}.rollup(1w)',
    onSelectMetric: () => {},
  },
};

export const Interactive: Story = {
  render: () => <InteractiveHarness />,
};
