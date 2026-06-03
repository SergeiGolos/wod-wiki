/**
 * Catalog / Atoms / Primitives / Badge
 *
 * Stories:
 *  1. Default — basic badge
 *  2. Variants — all badge variants
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/components/atoms/primitives/badge';

const meta: Meta<typeof Badge> = {
  title: 'catalog/atoms/primitives/Badge',
  component: Badge,
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
  render: () => <Badge>Default</Badge>,
};

export const Variants: Story = {
  render: () => (
    <>
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </>
  ),
};
