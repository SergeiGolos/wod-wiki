import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedWorkbench } from '@/components/layout/UnifiedWorkbench';

const meta: Meta<typeof UnifiedWorkbench> = {
  title: 'Runtime/RuntimeWorkbench',
  component: UnifiedWorkbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A workbench story designed for testing runtime execution order and memory manipulation.'
      }
    }
  },
  argTypes: {
    theme: {
      control: 'select',
      options: ['wod-light', 'wod-dark'],
    },
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const MemoryEditingTest: Story = {
  args: {
    initialContent: `# Memory Editing Test

This workout is designed to test manual memory manipulation.

\`\`\`wod
3 Rounds
  10 Air Squats
  Rest :30
\`\`\`

## Instructions

1. Click **Track** to enter execution mode.
2. Click the **Play** button to start the workout.
3. Open the **Debug Panel** (bug icon).
4. Locate a memory value (e.g., \`rounds-state\`, \`timer-state\`).
5. Click on the value to open the details dialog.
6. Click **Edit**, change the value (e.g., change current round), and click **Save**.
7. Verify the execution state updates accordingly.
`,
    showToolbar: true,
    readonly: false,
    theme: 'wod-light'
  }
};
