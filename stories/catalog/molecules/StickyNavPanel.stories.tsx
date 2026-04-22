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
  title: 'catalog/molecules/navigation/StickyNavPanel',
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

export const OverflowManyItems: Story = {
  name: 'Overflow (many nav items)',
  render: () => (
    <Controlled
      activations={[
        ...SECTIONS_LONG,
        { id: 's9', label: 'Mobility', action: { type: 'scroll', sectionId: 's9' } },
        { id: 's10', label: 'Accessory B', action: { type: 'scroll', sectionId: 's10' } },
        { id: 's11', label: 'Cool Down', action: { type: 'scroll', sectionId: 's11' } },
        { id: 's12', label: 'Reflection', action: { type: 'scroll', sectionId: 's12' } },
      ]}
      initialActive="s8"
      variant="top-fixed"
    />
  ),
};

export const MobileViewport: Story = {
  name: 'Mobile viewport',
  render: () => (
    <Controlled activations={SECTIONS_SHORT} initialActive="workouts" variant="hero-follow" />
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

// ── InsideCanvasPage — shows real scroll-observation context ─────────────────

const LONG_CONTENT = Array.from({ length: 5 }, (_, i) => `
<section id="s${i + 1}" style="min-height:300px; padding: 2rem; border-bottom: 1px solid #e5e7eb;">
  <h2 style="font-size:1.25rem; font-weight:600; margin-bottom:0.5rem;">Section ${i + 1}: ${SECTIONS_SHORT[i % SECTIONS_SHORT.length].label}</h2>
  ${Array.from({ length: 6 }, (_, j) => `<p style="margin-bottom:0.75rem; color:#6b7280;">Paragraph ${j + 1} of section ${i + 1}. Scroll down to observe active link changes in the sticky nav bar above.</p>`).join('\n  ')}
</section>`).join('\n')

export const InsideCanvasPage: Story = {
  name: 'InsideCanvasPage — scroll context',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="relative w-full h-screen overflow-y-auto bg-background">
        <div className="sticky top-0 z-20">
          <Story />
        </div>
        <div dangerouslySetInnerHTML={{ __html: LONG_CONTENT }} />
      </div>
    ),
  ],
  render: () => (
    <Controlled activations={SECTIONS_SHORT} initialActive="intro" variant="hero-follow" />
  ),
};

export const ScrollBehavior: Story = {
  ...InsideCanvasPage,
  name: 'Scroll behavior',
};
