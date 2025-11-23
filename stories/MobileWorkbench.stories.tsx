import type { Meta, StoryObj } from '@storybook/react';
import { MobileWorkbench } from '../src/components/layout/MobileWorkbench';
import { CommandProvider } from '../src/components/command-palette/CommandContext';

const meta: Meta<typeof MobileWorkbench> = {
  title: 'Layout/MobileWorkbench',
  component: MobileWorkbench,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  decorators: [
    (Story) => (
      <CommandProvider>
        <Story />
      </CommandProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MobileWorkbench>;

export const Default: Story = {
  args: {
    initialContent: `# Mobile Workout

\`\`\`wod
Timer: 10:00
  - 10 Pushups
  - 10 Situps
\`\`\`
`,
  },
};
