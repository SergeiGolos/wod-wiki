import { WodWorkbench } from '@/components/layout/WodWorkbench';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof WodWorkbench> = {
  title: 'Syntax',
  component: WodWorkbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Examples of WOD block syntax.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: `# WOD Syntax Examples

## For Time
\`\`\`wod
For Time:
  100 Burpees
\`\`\`

## AMRAP (As Many Rounds As Possible)
\`\`\`wod
20:00 AMRAP
  + 5 Pullups
  + 10 Pushups
  + 15 Squats
\`\`\`

## EMOM (Every Minute on the Minute)
\`\`\`wod
10:00 EMOM
  3 Clean and Jerks 135lb
\`\`\`

## Rounds for Time
\`\`\`wod
5 Rounds
  400m Run
  15 Overhead Squats 95lb
\`\`\`

## Tabata / Intervals
\`\`\`wod
8 Rounds
  :20 Work
  :10 Rest
  Air Squats
\`\`\`
`,
    showToolbar: false,
    readonly: false,
    theme: 'vs'
  }
};
