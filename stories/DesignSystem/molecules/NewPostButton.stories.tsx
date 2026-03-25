/**
 * DesignSystem / Molecules / NewPostButton
 *
 * Split pill: left half creates a new note for today, right half opens a
 * calendar dropdown to create-on-date or import markdown.
 */


import type { Meta, StoryObj } from '@storybook/react';
import { NewPostButton } from '@/components/history/NewPostButton';

const meta: Meta<typeof NewPostButton> = {
  title: 'DesignSystem/Molecules/NewPostButton',
  component: NewPostButton,
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
  name: 'Default (create today)',
  args: {
    onCreate: async (_date?: Date) => {
      alert(`Create entry for: ${_date?.toLocaleDateString() ?? 'today'}`);
    },
  },
};

export const WithImport: Story = {
  name: 'With markdown import option',
  args: {
    onCreate: async () => {},
    onImportMarkdown: async (md: string) => {
      alert(`Import ${md.length} chars of markdown`);
    },
  },
};
