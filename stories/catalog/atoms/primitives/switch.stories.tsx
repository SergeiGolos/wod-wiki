/**
 * Catalog / Atoms / Primitives / Switch
 *
 * Stories:
 *  1. Default — basic switch
 *  2. States — on/off and disabled
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  SwitchGroup,
  SwitchField,
  Switch,
} from '@/components/atoms/primitives/switch';
import { Label } from '@/components/atoms/primitives/label';

const meta: Meta<typeof Switch> = {
  title: 'catalog/atoms/primitives/Switch',
  component: Switch,
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
    <SwitchGroup>
      <SwitchField>
        <Label>Enable notifications</Label>
        <Switch defaultChecked={false} />
      </SwitchField>
    </SwitchGroup>
  ),
};

export const States: Story = {
  render: () => (
    <>
      <SwitchField>
        <Label>On</Label>
        <Switch defaultChecked />
      </SwitchField>
      <SwitchField>
        <Label>Off</Label>
        <Switch />
      </SwitchField>
      <SwitchField>
        <Label>Disabled</Label>
        <Switch disabled />
      </SwitchField>
    </>
  ),
};
