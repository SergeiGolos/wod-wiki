/**
 * DesignSystem / Molecules / NotebookMenu
 *
 * BookOpen dropdown that lets you switch notebooks (history context)
 * or add/remove the current entry from notebooks (workbench context).
 *
 * The NotebookProvider is supplied by StorybookHost.
 */


import type { Meta, StoryObj } from '@storybook/react';
import { NotebookMenu } from '@/components/notebook/NotebookMenu';

const meta: Meta<typeof NotebookMenu> = {
  title: 'DesignSystem/Molecules/NotebookMenu',
  component: NotebookMenu,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-6 bg-background rounded-lg border border-border flex items-center justify-center min-h-[120px]">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'History context (notebook selector)',
  args: {},
};

export const IconOnly: Story = {
  name: 'Icon-only variant',
  args: { iconOnly: true },
};

export const WithEntryContext: Story = {
  name: 'Workbench context (add/remove entry from notebook)',
  args: {
    entryTags: ['notebook:nb-benchmarks', 'benchmark'],
    onEntryToggle: (nbId: string, isAdding: boolean) => {
      alert(`${isAdding ? 'Add to' : 'Remove from'} notebook: ${nbId}`);
    },
  },
};
