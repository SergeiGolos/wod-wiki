/**
 * Catalog / Templates / LandingTemplate
 *
 * Renders: {@link import('@/playground/src/templates/LandingTemplate').LandingTemplate}
 * Data:     See {@link ../../data-for-storybook.md}
 *
 * Stories:
 *  1. Default — landing template with hero and content
 *  2. WithActions — landing template with actions slot
 *  3. NoHero — landing template without hero
 *  4. MobileViewport — mobile viewport
 */

import type { Meta, StoryObj } from '@storybook/react';
import { LandingTemplate } from '../../../playground/src/templates/LandingTemplate';

const meta: Meta<typeof LandingTemplate> = {
  title: 'catalog/templates/LandingTemplate',
  component: LandingTemplate,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Landing page shell with centered max-width container, ' +
          'optional actions slot (e.g. theme toggle), and hero slot.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const PlaceholderHero = () => (
  <div className="rounded-3xl border border-border/60 bg-card/70 px-6 py-10 shadow-sm">
    <div className="h-4 w-32 rounded bg-muted mb-4" />
    <div className="h-8 w-3/4 rounded bg-muted mb-2" />
    <div className="h-8 w-1/2 rounded bg-muted" />
  </div>
);

const PlaceholderContent = () => (
  <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
    <div className="xl:col-span-2 h-48 rounded-2xl border border-border bg-muted/30" />
    <div className="space-y-4">
      <div className="h-24 rounded-2xl border border-border bg-muted/30" />
      <div className="h-24 rounded-2xl border border-border bg-muted/30" />
    </div>
  </div>
);

export const Default: Story = {
  args: {
    heroSlot: <PlaceholderHero />,
    children: <PlaceholderContent />,
  },
};

export const WithActions: Story = {
  args: {
    actionsSlot: (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
        <div className="h-4 w-4 rounded-full bg-muted" />
        <div className="h-5 w-10 rounded-full bg-muted" />
        <div className="h-4 w-4 rounded-full bg-muted" />
      </div>
    ),
    heroSlot: <PlaceholderHero />,
    children: <PlaceholderContent />,
  },
};

export const NoHero: Story = {
  args: {
    children: <PlaceholderContent />,
  },
};

export const MobileViewport: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    actionsSlot: (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
        <div className="h-4 w-4 rounded-full bg-muted" />
        <div className="h-5 w-10 rounded-full bg-muted" />
        <div className="h-4 w-4 rounded-full bg-muted" />
      </div>
    ),
    heroSlot: <PlaceholderHero />,
    children: <PlaceholderContent />,
  },
};
