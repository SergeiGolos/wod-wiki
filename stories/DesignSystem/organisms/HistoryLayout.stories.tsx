/**
 * DesignSystem / Organisms / HistoryLayout
 *
 * Full application header + content slot used by the main history/journal views.
 * Provides the nav bar (logo, tabs, actions) and a scrollable main area slot.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HistoryLayout } from '@/components/history/HistoryLayout';
import { NewPostButton } from '@/components/history/NewPostButton';

const PlaceholderContent: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-8">
    <span className="text-4xl">💪</span>
    <p className="text-sm font-medium">{label}</p>
    <p className="text-xs text-center max-w-xs">
      This area is the scrollable content slot of HistoryLayout — swap in
      HistoryPostList, calendar grids, or any other list organism here.
    </p>
  </div>
);

const meta: Meta<typeof HistoryLayout> = {
  title: 'DesignSystem/Organisms/HistoryLayout',
  component: HistoryLayout,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default layout — desktop',
  render: () => (
    <HistoryLayout>
      <PlaceholderContent label="Workout History" />
    </HistoryLayout>
  ),
};

export const Mobile: Story = {
  name: 'Mobile variant',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: () => (
    <HistoryLayout>
      <PlaceholderContent label="Mobile History" />
    </HistoryLayout>
  ),
};

export const WithNewPostButton: Story = {
  name: 'With New Post action in header',
  render: () => (
    <HistoryLayout
      headerExtras={
        <NewPostButton onCreate={async () => alert('Create entry')} />
      }
    >
      <PlaceholderContent label="Your workout journal" />
    </HistoryLayout>
  ),
};

export const WithDetailsPanel: Story = {
  name: 'With side-panel toggle button',
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <HistoryLayout
        onOpenDetails={() => setOpen(o => !o)}
        isDetailsOpen={open}
      >
        <div className="flex h-full">
          <PlaceholderContent label="Main content area" />
          {open && (
            <div className="w-72 shrink-0 border-l border-border p-4 bg-muted/20 flex items-start">
              <p className="text-xs text-muted-foreground">Side panel open</p>
            </div>
          )}
        </div>
      </HistoryLayout>
    );
  },
};
