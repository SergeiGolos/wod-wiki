/**
 * DesignSystem / Organisms / PanelGrid
 *
 * Responsive flex container that manages multiple PanelShell children.
 * Layout adapts across desktop (side-by-side) → tablet (equal splits) → mobile (stacked).
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PanelGrid } from '@/panels/panel-system/PanelGrid';
import type { PanelDescriptor, PanelLayoutState } from '@/panels/panel-system/types';

// Simple coloured panel placeholder
const Panel: React.FC<{ label: string; colour?: string }> = ({
  label,
  colour = 'bg-muted',
}) => (
  <div
    className={`h-full flex flex-col items-center justify-center gap-2 ${colour} rounded-sm`}
  >
    <span className="text-sm font-semibold text-foreground">{label}</span>
  </div>
);

// ── Shared helper ────────────────────────────────────────────────────────────

const makeLayout = (ids: string[]): PanelLayoutState => ({
  viewId: 'story',
  panelSpans: Object.fromEntries(ids.map(id => [id, 1])),
  expandedPanelId: null,
});

const meta: Meta<typeof PanelGrid> = {
  title: 'DesignSystem/Organisms/PanelGrid',
  component: PanelGrid,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="h-[500px] border border-border rounded-lg overflow-hidden bg-background">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const TwoPanels: Story = {
  name: 'Two panels — editor (2/3) + filter (1/3)',
  render: () => {
    const panels: PanelDescriptor[] = [
      {
        id: 'editor',
        defaultSpan: 2,
        content: <Panel label="Editor Panel" colour="bg-primary/5" />,
      },
      {
        id: 'filter',
        defaultSpan: 1,
        content: <Panel label="Filter Panel" colour="bg-muted" />,
      },
    ];
    const layout: PanelLayoutState = {
      viewId: 'story',
      panelSpans: { editor: 2, filter: 1 },
      expandedPanelId: null,
    };
    return <PanelGrid panels={panels} layoutState={layout} />;
  },
};

export const ThreePanels: Story = {
  name: 'Three panels — equal width',
  render: () => {
    const panels: PanelDescriptor[] = [
      {
        id: 'sidebar',
        defaultSpan: 1,
        content: <Panel label="Sidebar" colour="bg-muted/60" />,
      },
      {
        id: 'main',
        defaultSpan: 2,
        content: <Panel label="Main Content" colour="bg-primary/5" />,
      },
      {
        id: 'details',
        defaultSpan: 1,
        content: <Panel label="Details" colour="bg-muted/40" />,
      },
    ];
    return <PanelGrid panels={panels} layoutState={makeLayout(['sidebar', 'main', 'details'])} />;
  },
};

export const SinglePanel: Story = {
  name: 'Single full-width panel',
  render: () => {
    const panels: PanelDescriptor[] = [
      {
        id: 'full',
        defaultSpan: 3,
        content: <Panel label="Full-width Panel" colour="bg-primary/5" />,
      },
    ];
    return (
      <PanelGrid
        panels={panels}
        layoutState={{ viewId: 'story', panelSpans: { full: 3 }, expandedPanelId: null }}
      />
    );
  },
};

export const MobileHidden: Story = {
  name: 'One panel hidden on mobile (resize to see)',
  render: () => {
    const panels: PanelDescriptor[] = [
      {
        id: 'sidebar',
        defaultSpan: 1,
        hideOnMobile: true,
        content: <Panel label="Sidebar (hidden on mobile)" colour="bg-muted/60" />,
      },
      {
        id: 'main',
        defaultSpan: 2,
        content: <Panel label="Main (always visible)" colour="bg-primary/5" />,
      },
    ];
    return <PanelGrid panels={panels} layoutState={makeLayout(['sidebar', 'main'])} />;
  },
};
