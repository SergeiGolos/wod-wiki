/**
 * Catalog / Atoms / CommitGraph
 *
 * Animated commit-grid hero visual — renders text as pixel-art over a
 * GitHub-style contribution grid.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { CommitGraph } from '@/components/ui/CommitGraph';

const meta: Meta<typeof CommitGraph> = {
  title: 'catalog/atoms/CommitGraph',
  component: CommitGraph,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-8 bg-background rounded-lg border border-border w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default',
  render: () => <CommitGraph />,
};

export const CustomText: Story = {
  name: 'Custom text',
  render: () => (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground font-mono">text prop</p>
      <CommitGraph text="WOD.WIKI" />
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Sizes',
  render: () => (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground font-mono">rows / cols / gap</p>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Small (rows=4, cols=50)</p>
          <CommitGraph text="LIFT" rows={4} cols={50} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Default (rows=5, cols=70)</p>
          <CommitGraph />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Large (rows=7, cols=90)</p>
          <CommitGraph text="WOD" rows={7} cols={90} />
        </div>
      </div>
    </div>
  ),
};

export const NoRandomness: Story = {
  name: 'No randomness',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">randomness=false — deterministic grid</p>
      <CommitGraph randomness={false} />
    </div>
  ),
};
