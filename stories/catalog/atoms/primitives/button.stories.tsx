/**
 * Catalog / Atoms / Primitives / Button
 *
 * Stories:
 *  1. Default — basic button
 *  2. Variants — all button variants
 *  3. Sizes — all button sizes
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/atoms/primitives/button';

const meta: Meta<typeof Button> = {
  title: 'catalog/atoms/primitives/Button',
  component: Button,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="flex flex-wrap gap-4 p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Button>Default</Button>,
};

export const Variants: Story = {
  render: () => (
    <>
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </>
  ),
};

export const Sizes: Story = {
  render: () => (
    <>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">Icon</Button>
    </>
  ),
};
