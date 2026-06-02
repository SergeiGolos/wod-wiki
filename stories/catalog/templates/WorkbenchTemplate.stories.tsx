/**
 * Catalog / Templates / WorkbenchTemplate
 *
 * Full-screen application shell with header bar and scrollable/overflow-hidden
 * content well. Used by the workbench and any other fullscreen tool layout.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { WorkbenchTemplate } from '@/templates/WorkbenchTemplate';

const meta: Meta<typeof WorkbenchTemplate> = {
  title: 'catalog/templates/WorkbenchTemplate',
  component: WorkbenchTemplate,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Fullscreen workbench shell. Provides a header slot, content area, ' +
          'and optional drag-overlay / side-panel slots.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const PlaceholderHeader = () => (
  <div className="h-14 flex items-center px-4 border-b border-border bg-muted/30">
    <div className="h-6 w-32 rounded bg-muted" />
    <div className="ml-auto flex gap-2">
      <div className="h-8 w-8 rounded bg-muted" />
      <div className="h-8 w-8 rounded bg-muted" />
    </div>
  </div>
);

const PlaceholderContent = ({ label = 'Content area' }: { label?: string }) => (
  <div className="flex items-center justify-center h-full bg-background">
    <div className="text-muted-foreground text-sm">{label}</div>
  </div>
);

export const Default: Story = {
  args: {
    header: <PlaceholderHeader />,
    children: <PlaceholderContent label="Plan / Track / Review viewport" />,
  },
};

export const WithDragOverlay: Story = {
  args: {
    header: <PlaceholderHeader />,
    children: <PlaceholderContent label="Drop a file to see overlay" />,
    dragOverlay: (
      <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-primary">
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <p className="text-xl font-medium">Drop files to attach</p>
        </div>
      </div>
    ),
  },
};

export const WithSidePanel: Story = {
  args: {
    header: <PlaceholderHeader />,
    children: <PlaceholderContent label="Main viewport" />,
    sidePanel: (
      <div className="absolute right-0 top-0 h-full w-80 border-l border-border bg-card shadow-xl p-4">
        <div className="h-4 w-24 rounded bg-muted mb-4" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
    ),
  },
};
