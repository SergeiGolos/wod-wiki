/**
 * Catalog / Molecules / Layout / HeroBanner
 *
 * Full-width hero section for page shells.
 * Supports gradient, image, or plain background variants.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { HeroBanner } from '@/panels/page-shells/HeroBanner';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

const meta: Meta<typeof HeroBanner> = {
  title: 'catalog/molecules/layout/HeroBanner',
  component: HeroBanner,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof HeroBanner>;

export const Default: Story = {
  args: {
    title: 'WOD Wiki',
    subtitle: 'The smart workout companion for high-performance athletes.',
  },
};

export const WithCTA: Story = {
  args: {
    title: 'Start Training',
    subtitle: 'Choose from hundreds of benchmark workouts or create your own.',
    cta: (
      <Button size="lg" className="rounded-full px-8">
        <Play className="mr-2 h-5 w-5 fill-current" />
        Explore Workouts
      </Button>
    ),
  },
};

export const PlainBackground: Story = {
  args: {
    title: 'Plain Hero',
    subtitle: 'A clean hero section without the background gradient.',
    backgroundVariant: 'plain',
  },
};

export const ImageBackground: Story = {
  decorators: [
    (Story) => (
      <div className="bg-zinc-900 text-white min-h-[400px]">
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'Dark Mode Hero',
    subtitle: 'Hero section rendered inside a dark container.',
    backgroundVariant: 'image',
  },
};
