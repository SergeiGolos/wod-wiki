/**
 * DesignSystem / Molecules / StickyNavPanel
 *
 * Sticky top-of-panel navigation bar for canvas / scroll-section pages.
 * Each item is an INavActivation; clicking dispatches through executeNavAction.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StickyNavPanel } from '@/panels/page-shells/StickyNavPanel';
import type { INavActivation, NavActionDeps } from '@/nav/navTypes';

const SECTIONS_SHORT: INavActivation[] = [
  { id: 'intro',    label: 'Intro',    action: { type: 'scroll', sectionId: 'intro' } },
  { id: 'workouts', label: 'Workouts', action: { type: 'scroll', sectionId: 'workouts' } },
  { id: 'schedule', label: 'Schedule', action: { type: 'scroll', sectionId: 'schedule' } },
  { id: 'results',  label: 'Results',  action: { type: 'scroll', sectionId: 'results' } },
];

const SECTIONS_LONG: INavActivation[] = [
  { id: 's1', label: 'Overview',     action: { type: 'scroll', sectionId: 's1' } },
  { id: 's2', label: 'Warm-up',      action: { type: 'scroll', sectionId: 's2' } },
  { id: 's3', label: 'Strength',     action: { type: 'scroll', sectionId: 's3' } },
  { id: 's4', label: 'Conditioning', action: { type: 'scroll', sectionId: 's4' } },
  { id: 's5', label: 'Accessory',    action: { type: 'scroll', sectionId: 's5' } },
  { id: 's6', label: 'Cool-down',    action: { type: 'scroll', sectionId: 's6' } },
  { id: 's7', label: 'Recovery',     action: { type: 'scroll', sectionId: 's7' } },
  { id: 's8', label: 'Notes',        action: { type: 'scroll', sectionId: 's8' } },
];

const Controlled: React.FC<{
  activations: INavActivation[];
  initialActive: string;
  variant: 'hero-follow' | 'top-fixed';
}> = ({ activations, initialActive, variant }) => {
  const [active, setActive] = useState(initialActive);

  const deps: NavActionDeps = {
    navigate: () => {},
    setQueryParam: () => {},
    scrollToSection: (id) => setActive(id),
  };

  return (
    <StickyNavPanel
      activations={activations}
      activeSection={active}
      variant={variant}
      deps={deps}
    />
  );
};

const meta: Meta<typeof StickyNavPanel> = {
  title: 'DesignSystem/Molecules/StickyNavPanel',
  component: StickyNavPanel,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="bg-background min-h-[200px] border border-border rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const HeroFollow: Story = {
  name: 'hero-follow — 4 sections, first active',
  render: () => (
    <Controlled activations={SECTIONS_SHORT} initialActive="intro" variant="hero-follow" />
  ),
};

export const TopFixed: Story = {
  name: 'top-fixed — 4 sections, second active',
  render: () => (
    <Controlled activations={SECTIONS_SHORT} initialActive="workouts" variant="top-fixed" />
  ),
};

export const ManySections: Story = {
  name: 'Many sections (overflow behaviour)',
  render: () => (
    <Controlled activations={SECTIONS_LONG} initialActive="s3" variant="hero-follow" />
  ),
};
