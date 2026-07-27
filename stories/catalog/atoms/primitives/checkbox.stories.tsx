/**
 * Catalog / Atoms / Primitives / Checkbox
 *
 * Stories:
 *  1. Default — basic checkbox group
 *  2. States — checked, unchecked, disabled
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  CheckboxGroup,
  CheckboxField,
  Checkbox,
} from '@/components/atoms/primitives/checkbox';
import { Label } from '@/components/atoms/primitives/label';

const meta: Meta<typeof Checkbox> = {
  title: 'catalog/atoms/primitives/Checkbox',
  component: Checkbox,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="space-y-6 p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <CheckboxGroup>
      <CheckboxField>
        <Label>Options</Label>
        <Checkbox defaultChecked />
        <Label>Option 1</Label>
      </CheckboxField>
      <CheckboxField>
        <Checkbox />
        <Label>Option 2</Label>
      </CheckboxField>
    </CheckboxGroup>
  ),
};

export const States: Story = {
  render: () => (
    <>
      <CheckboxField>
        <Checkbox defaultChecked />
        <Label>Checked</Label>
      </CheckboxField>
      <CheckboxField>
        <Checkbox />
        <Label>Unchecked</Label>
      </CheckboxField>
      <CheckboxField>
        <Checkbox disabled />
        <Label>Disabled</Label>
      </CheckboxField>
    </>
  ),
};
