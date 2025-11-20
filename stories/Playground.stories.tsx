import { WodWorkbench } from '@/components/layout/WodWorkbench';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof WodWorkbench> = {
  title: 'Playground',
  component: WodWorkbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Interactive playground for the WOD Wiki editor.'
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
      options: ['vs', 'vs-dark', 'hc-black'],
      description: 'Monaco editor theme'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: `# My Workout Log - ${new Date().toLocaleDateString()}

Welcome to the markdown editor with WOD block support!

## Morning Session

\`\`\`wod
20:00 AMRAP
  + 5 Pullups
  + 10 Pushups
  + 15 Squats
\`\`\`

Great workout today! Felt strong.

## Evening Session

\`\`\`wod
(21-15-9)
  Thrusters 95lb
  Pullups
\`\`\`

Classic benchmark WOD.`,
    showToolbar: false,
    readonly: false,
    theme: 'vs'
  }
};
