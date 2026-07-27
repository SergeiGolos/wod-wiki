/**
 * Catalog / Atoms / Primitives / Progress
 *
 * Stories:
 *  1. Values — progress at different values (0, 25, 50, 75, 100)
 *  2. Indeterminate — indeterminate progress
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from '@/components/atoms/primitives/progress';

const meta: Meta<typeof Progress> = {
  title: 'catalog/atoms/primitives/Progress',
  component: Progress,
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

export const Values: Story = {
  render: () => (
    <>
      <div>
        <div className="mb-2 text-sm">0%</div>
        <Progress value={0} />
      </div>
      <div>
        <div className="mb-2 text-sm">25%</div>
        <Progress value={25} />
      </div>
      <div>
        <div className="mb-2 text-sm">50%</div>
        <Progress value={50} />
      </div>
      <div>
        <div className="mb-2 text-sm">75%</div>
        <Progress value={75} />
      </div>
      <div>
        <div className="mb-2 text-sm">100%</div>
        <Progress value={100} />
      </div>
    </>
  ),
};

export const Indeterminate: Story = {
  render: () => <Progress />,
};
