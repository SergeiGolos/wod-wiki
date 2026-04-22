/**
 * Catalog / Atoms / Button
 *
 * All Button variants, sizes, and states from the design system.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof Button> = {
  title: 'catalog/atoms/interactive/Button',
  component: Button,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-8 space-y-6 max-w-2xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  name: 'Variants',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">variant</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Sizes',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">size</p>
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon">🏋️</Button>
      </div>
    </div>
  ),
};

export const States: Story = {
  name: 'States',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">states</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled>Disabled</Button>
        <Button variant="outline" disabled>
          Disabled outline
        </Button>
      </div>
    </div>
  ),
};
