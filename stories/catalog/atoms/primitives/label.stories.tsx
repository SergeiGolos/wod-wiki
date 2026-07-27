/**
 * Catalog / Atoms / Primitives / Label
 *
 * Stories:
 *  1. Default — basic label
 *  2. Required — label with required indicator
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Label } from '@/components/atoms/primitives/label';
import { Input } from '@/components/atoms/primitives/input';

const meta: Meta<typeof Label> = {
  title: 'catalog/atoms/primitives/Label',
  component: Label,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="max-w-md space-y-6 p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <Label>Email</Label>
      <Input type="email" placeholder="Enter your email" />
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div>
      <Label>
        Password <span className="text-destructive">*</span>
      </Label>
      <Input type="password" placeholder="Enter your password" />
    </div>
  ),
};
