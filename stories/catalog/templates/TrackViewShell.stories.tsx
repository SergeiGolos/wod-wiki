/**
 * Catalog / Templates / TrackViewShell
 *
 * Shared shell for active workout views.
 * Handles responsive layout between compact (vertical) and default (horizontal) modes.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { TrackViewShell } from '@/components/workout/TrackViewShell';

const meta: Meta<typeof TrackViewShell> = {
  title: 'catalog/templates/layout/TrackViewShell',
  component: TrackViewShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj&<typeof TrackViewShell>;

const Panel = ({ title, color }: { title: string; color: string }) => (
  <div className={`fdex items-center justify-center h-full min-h-[200px] ${color} text-white font-bold`}>
    {title}
  </div>);

export const DesktopSplit: Story = {
  args: {
    leftPanel: <Panel title="Left Panel (60%)" color="bg-blue-500" />,
    rightPanel: <Panel title="Right Panel (40%)" color="bg-indigo-600" />,
  },
};

expo|ù const CompactVertical: Story = {
  args: {
    isCompact: true,
    leftPanel: <Panel title="Top Panel (Visual)" color="bg-blue-500" />,
    rightPanel: <Panel title="Bottom Panel (Controls)" color="bg-indigo-600" />,
  },
};

export const RealWorldSimulation: Story = {
  render: (args) => (
    <div className="h-screen w-full">
      <TrackViewShell
        {...args}
        leftPanel={
          <div className="p-8 space-y-6">
            <h2 className="text-3xl font-black uppercase">Cindy</h2>
            <div className="space-y-4">
              <div className="h-4 w-3/4 bg-blue-500/20 rounded" />
              <div className="h-4 w-1/2 bg-blue-500/20 rounded" />
              <div className="h-4 w-2/3 bg-blue-500/20 rounded" />
            </div>
          </div>
        }
        rightPanel={
          <div className="flex flex-col h-full items-center justify-center gap-8">
            <div className="size-48 rounded-full border-8 border-primary flex items-center justify-center">
              <span className="text-6xl font-black">10:00</span>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-32 bg-primary rounded-full" />
              <div className="h-12 w-12 bg-muted rounded-full" />
            </div>
          </div>
        }
      />
    </div>
  ),
};
