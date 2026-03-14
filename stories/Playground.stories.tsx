import { StorybookWorkbench as Workbench } from './StorybookWorkbench';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

const meta: Meta<typeof Workbench> = {
  title: 'Playground',
  component: Workbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Interactive WOD Wiki editor with runtime execution and graph display.'
      }
    }
  },
  argTypes: {
    initialContent: {
      control: 'text',
      description: 'Initial workout script content'
    },
    initialViewMode: {
      control: 'select',
      options: ['plan', 'track', 'review'],
      description: 'Initial view mode',
    },
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: `# My Workout Log - 2024-03-14

---
test:value1
---

Use this blank canvas to log your daily training.

**Quick Tip:** Press **Ctrl+Space** to view available templates and start inserting exercises.

\`\`\`wod
Timer 10:00
  - 10 Pushups
  - 10 Situps
  - 10 Squats
\`\`\`

## Notes

Add your workout notes here.
`,
    showToolbar: false,
    readonly: false,
    initialViewMode: 'plan',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify the toolbar label is present
    await expect(canvas.getByText(/WOD Wiki/i)).toBeInTheDocument();
  }
};
