import { UnifiedWorkbench } from '@/components/layout/UnifiedWorkbench';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof UnifiedWorkbench> = {
  title: 'Playground',
  component: UnifiedWorkbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Interactive playground for the WOD Wiki editor with responsive layout.'
      }
    }
  },
  argTypes: {
    initialContent: {
      control: 'text',
      description: 'Initial markdown content to display'
    },
    showToolbar: {
      control: 'boolean',
      description: 'Whether to show markdown toolbar'
    },
    readonly: {
      control: 'boolean',
      description: 'Whether editor is read-only'
    },
    theme: {
      control: 'select',
      options: ['wod-light', 'wod-dark'],
      description: 'Editor theme',
      table: { defaultValue: { summary: 'wod-light' } }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: `# My Workout Log - ${new Date().toLocaleDateString()}

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
    theme: 'wod-light'
  }
};
