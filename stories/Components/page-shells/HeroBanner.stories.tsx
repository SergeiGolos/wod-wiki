/**
 * HeroBanner Stories
 *
 * Demonstrates the HeroBanner primitive with different background variants.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { HeroBanner } from '@/panels/page-shells/HeroBanner';

const meta: Meta<typeof HeroBanner> = {
  title: 'Pages/HeroBanner',
  component: HeroBanner,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-width hero section for page shells. Supports gradient, image, and plain background variants.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Gradient background with CTA button.
 */
export const Gradient: Story = {
  render: () => (
    <div className="bg-background">
      <HeroBanner
        title="WOD.WIKI"
        subtitle="Plan your training, track performance, analyze collected metrics — all with the simplicity of a wiki notebook."
        backgroundVariant="gradient"
        cta={
          <button className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-black text-sm uppercase tracking-wider shadow-lg">
            Get Started
          </button>
        }
      />
    </div>
  ),
};

/**
 * Plain background — no decoration.
 */
export const Plain: Story = {
  render: () => (
    <div className="bg-background">
      <HeroBanner
        title="Syntax Reference"
        subtitle="Complete language reference for WodScript."
        backgroundVariant="plain"
      />
    </div>
  ),
};
