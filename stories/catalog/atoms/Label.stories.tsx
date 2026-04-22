/**
 * Catalog / Atoms / Label
 *
 * Accessible form field label via Radix — pairs with input elements.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Label } from '@/components/ui/label';

const meta: Meta<typeof Label> = {
  title: 'catalog/atoms/display/Label',
  component: Label,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-8 space-y-6 max-w-sm">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default',
  render: () => (
    <div className="space-y-1.5">
      <Label htmlFor="effort">Effort level</Label>
      <input
        id="effort"
        type="text"
        placeholder="e.g. @bodyweight"
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  ),
};

export const FormGroup: Story = {
  name: 'Form group',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">label + input pairing</p>
      <div className="space-y-1.5">
        <Label htmlFor="wod-name">Workout name</Label>
        <input
          id="wod-name"
          type="text"
          placeholder="e.g. Fran"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="duration">Duration (seconds)</Label>
        <input
          id="duration"
          type="number"
          placeholder="600"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>
  ),
};

export const DisabledState: Story = {
  name: 'Disabled state',
  render: () => (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground font-mono mb-3">peer-disabled styling</p>
      <div className="space-y-1.5">
        <Label htmlFor="locked" className="peer">Locked field</Label>
        <input
          id="locked"
          type="text"
          disabled
          value="Read-only value"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm opacity-50 cursor-not-allowed"
        />
      </div>
    </div>
  ),
};
