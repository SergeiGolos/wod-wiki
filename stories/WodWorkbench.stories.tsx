import type { Meta, StoryObj } from '@storybook/react';
import { WodWorkbench } from '../src/components/layout/WodWorkbench';

const meta: Meta<typeof WodWorkbench> = {
  title: 'Layout/WodWorkbench',
  component: WodWorkbench,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof WodWorkbench>;

export const Default: Story = {};
