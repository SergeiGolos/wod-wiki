/**
 * Catalog / Atoms / Primitives / Select
 *
 * Stories:
 *  1. Default — basic select dropdown
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Select } from '@/components/atoms/primitives/select';
import { Label } from '@/components/atoms/primitives/label';

const meta: Meta<typeof Select> = {
  title: 'catalog/atoms/primitives/Select',
  component: Select,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-md p-8">
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
      <Label>Favorite Fruit</Label>
      <Select>
        <option value="">Select a fruit</option>
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
        <option value="orange">Orange</option>
        <option value="mango">Mango</option>
      </Select>
    </div>
  ),
};
