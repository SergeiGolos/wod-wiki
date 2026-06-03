/**
 * Catalog / Atoms / Primitives / Textarea
 *
 * Stories:
 *  1. Default — basic textarea
 *  2. Disabled — disabled textarea
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '@/components/atoms/primitives/textarea';
import { Label } from '@/components/atoms/primitives/label';

const meta: Meta<typeof Textarea> = {
  title: 'catalog/atoms/primitives/Textarea',
  component: Textarea,
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
      <Label>Notes</Label>
      <Textarea
        placeholder="Enter your notes here..."
        rows={4}
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div>
      <Label>Disabled</Label>
      <Textarea
        disabled
        placeholder="This textarea is disabled"
        rows={4}
      />
    </div>
  ),
};
