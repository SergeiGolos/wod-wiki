/**
 * DesignSystem / Molecules / StickyNavPanel
 *
 * Sticky top-of-panel navigation bar for canvas / scroll-section pages.
 * Sections are buttons; clicking fires the onSectionClick callback.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StickyNavPanel } from '@/panels/page-shells/StickyNavPanel';

const SECTIONS_SHORT = [
  { id: 'intro', label: 'Intro' },
  { id: 'workouts', label: 'Workouts' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'results', label: 'Results' },
];

const SECTIONS_LONG = [
  { id: 's1', label: 'Overview' },
  { id: 's2', label: 'Warm-up' },
  { id: 's3', label: 'Strength' },
  { id: 's4', label: 'Conditioning' },
  { id: 's5', label: 'Accessory' },
  { id: 's6', label: 'Cool-down' },
  { id: 's7', label: 'Recovery' },
  { id: 's8', label: 'Notes' },
];

const Controlled: React.FC<{
  sections: typeof SECTIONS_SHORT;
  initialActive: string;
  variant: 'hero-follow' | 'top-fixed';
}> = ({ sections, initialActive, variant }) => {
  const [active, setActive] = useState(initialActive);
  return (
    <StickyNavPanel
      sections={sections}
      activeSection={active}
      variant={variant}
      onSectionClick={setActive}
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
    <Controlled sections={SECTIONS_SHORT} initialActive="intro" variant="hero-follow" />
  ),
};

export const TopFixed: Story = {
  name: 'top-fixed — 4 sections, second active',
  render: () => (
    <Controlled sections={SECTIONS_SHORT} initialActive="workouts" variant="top-fixed" />
  ),
};

export const ManySections: Story = {
  name: 'Many sections (overflow behaviour)',
  render: () => (
    <Controlled sections={SECTIONS_LONG} initialActive="s3" variant="hero-follow" />
  ),
};
