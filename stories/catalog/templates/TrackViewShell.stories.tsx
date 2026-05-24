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
type Story = StoryObj<typeof TrackViewShell>;

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

export const CompactVertical: Story = {
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

// ── Mobile width variants ───────────────────────────────────────────────────

const MobileShellStory: React.FC<{ width: number; height?: number }> = ({ width, height = 667 }) => (
  <div style={{ width, height }} className="border border-border rounded-lg overflow-hidden bg-background mx-auto">
    <TrackViewShell
      isCompact
      leftPanel={
        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="text-sm font-bold">Round 1 — 21 Thrusters</div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 bg-blue-500/20 rounded" />
            <div className="h-3 w-1/2 bg-blue-500/20 rounded" />
          </div>
        </div>
      }
      rightPanel={
        <div className="flex flex-col h-full items-center justify-center gap-4 px-4">
          <span className="text-5xl font-black tabular-nums">02:15</span>
          <div className="flex gap-3">
            <div className="h-12 w-12 bg-muted rounded-full" />
            <div className="h-14 w-14 bg-primary rounded-full" />
            <div className="h-14 flex-1 bg-foreground rounded-2xl" />
          </div>
        </div>
      }
    />
  </div>
);

export const Compact320px: Story = {
  name: 'Compact — 320px width',
  render: () => <MobileShellStory width={320} />,
};

export const Compact375px: Story = {
  name: 'Compact — 375px width',
  render: () => <MobileShellStory width={375} />,
};

export const Compact480px: Story = {
  name: 'Compact — 480px width',
  render: () => <MobileShellStory width={480} />,
};
