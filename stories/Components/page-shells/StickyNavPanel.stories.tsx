/**
 * StickyNavPanel Stories
 *
 * Demonstrates the StickyNavPanel navigation primitive.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { StickyNavPanel } from '@/panels/page-shells/StickyNavPanel';

const meta: Meta<typeof StickyNavPanel> = {
  title: 'Pages/StickyNavPanel',
  component: StickyNavPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Sticky navigation bar that tracks the active section. Supports top-fixed and hero-follow variants.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const SECTIONS = [
  { id: 'intro', label: 'Introduction' },
  { id: 'basics', label: 'Basics' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'reference', label: 'Reference' },
];

function StickyNavDemo({ variant }: { variant: 'top-fixed' | 'hero-follow' }) {
  const [active, setActive] = useState('intro');

  return (
    <div className="bg-background min-h-[200vh]">
      {variant === 'hero-follow' && (
        <div className="h-[104px] bg-muted/30 flex items-center justify-center border-b border-border/50">
          <span className="text-sm text-muted-foreground font-bold">
            Hero Banner Area
          </span>
        </div>
      )}
      <StickyNavPanel
        sections={SECTIONS}
        activeSection={active}
        variant={variant}
        onSectionClick={(id) => setActive(id)}
      />
      <div className="p-8 space-y-96">
        {SECTIONS.map((s) => (
          <div key={s.id} id={s.id}>
            <h2 className="text-xl font-black text-foreground uppercase">
              {s.label}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Scroll content for section: {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hero-follow variant — floats below a hero banner.
 */
export const HeroFollow: Story = {
  render: () => <StickyNavDemo variant="hero-follow" />,
};

/**
 * Top-fixed variant — pinned to the top of the viewport.
 */
export const TopFixed: Story = {
  render: () => <StickyNavDemo variant="top-fixed" />,
};
