import { Workbench } from '@/components/layout/Workbench';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Workbench> = {
  title: 'Overview',
  component: Workbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Overview of the WOD Wiki editor capabilities.'
      }
    }
  },
  argTypes: {
    theme: {
      control: 'select',
      options: ['wod-light', 'wod-dark'],
      description: 'Editor theme',
      table: { defaultValue: { summary: 'wod-light' } }
    },
    showToolbar: { control: 'boolean' },
    readonly: { control: 'boolean' }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: `# WOD Wiki Overview

Welcome to WOD Wiki! This tool lets you define, execute, and track your workouts using a powerful text-based interface.

## 1. Recording a Workout

You define workouts using **WOD Blocks**. These blocks use a special syntax to describe exercises, rounds, and timers.

Here is a simple recording example:

\`\`\`wod
3 Rounds
  10 Thrusters 95lb
  10 Pullups
  Rest :60
\`\`\`

## 2. Running the Workout

Once a workout is defined, you can interact with it:
- Click **Edit** to modify the script.
- Click **Track** to enter execution mode. The runtime engine will guide you through the workout, tracking time and sets.
- Click **Analyze** to see performance data.

## 3. Metrics Collection

The system automatically parses and collects metrics from your workout:
- **Reps**: Tracked from lines like \`10 Pullups\`.
- **Load**: Extracted from weights like \`95lb\`.
- **Time**: Managed by timers like \`:60\`.
- **Structure**: Rounds and sets are preserved.

Everything happens inline, giving you full control over your training data.
`,
    showToolbar: true,
    readonly: false,
    theme: 'wod-light'
  }
};
