/**
 * Catalog / Atoms / Primitives / Input
 *
 * Stories:
 *  1. Default — basic input
 *  2. WithIcon — input with icon
 *  3. Disabled — disabled input
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Input, InputGroup } from '@/components/atoms/primitives/input';
import { Label } from '@/components/atoms/primitives/label';
import { Search } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'catalog/atoms/primitives/Input',
  component: Input,
  parameters: { layout: 'padded' },
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

export const WithIcon: Story = {
  render: () => (
    <InputGroup>
      <Search data-slot="icon" />
      <Input type="search" placeholder="Search..." />
    </InputGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div>
      <Label>Disabled</Label>
      <Input disabled placeholder="Disabled input" />
    </div>
  ),
};
