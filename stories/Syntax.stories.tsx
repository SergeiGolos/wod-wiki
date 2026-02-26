import { StorybookWorkbench as Workbench } from './StorybookWorkbench';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Workbench> = {
  title: 'Syntax',
  component: Workbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Comprehensive guide to WOD Wiki syntax.'
      }
    }
  },
  args: {
    showToolbar: true,
    readonly: true,
    theme: 'wod-light',
    initialShowPlan: true,
    initialShowTrack: true,
    initialShowReview: true
  },
  argTypes: {
    initialContent: { control: 'text' },
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

export const BasicStructure: Story = {
  args: {
    initialContent: `# Basic Structure

A WOD block is defined by \`\`\`wod ... \`\`\`.
Inside, you list exercises and instructions.

\`\`\`wod
Pushups
Situps
Squats
\`\`\`
`
  }
};

export const RoundsAndGrouping: Story = {
  args: {
    initialContent: `# Rounds and Grouping

Use parentheses \`()\` to group exercises into rounds.

## Simple Rounds
\`\`\`wod
(3 Rounds)
  10 Pushups
  10 Situps
\`\`\`

## Rep Schemes
You can define varying rep counts for each round.
\`\`\`wod
(21-15-9)
  Thrusters
  Pullups
\`\`\`
This creates 3 rounds:
1. 21 reps of each
2. 15 reps of each
3. 9 reps of each

## Named Groups
You can name your groups for clarity.
\`\`\`wod
(Warmup)
  Run 400m
  Stretch
\`\`\`
`
  }
};

export const TimersAndIntervals: Story = {
  args: {
    initialContent: `# Timers and Intervals

Time components are crucial for workouts.

## Duration (For Time)
Just list the exercises. The timer counts up.
\`\`\`wod
  100 Burpees
\`\`\`

## Fixed Time (AMRAP)
Set a time cap.
\`\`\`wod
20:00
  (AMRAP)
    5 Pullups
    10 Pushups
    15 Squats
\`\`\`

## EMOM (Every Minute on the Minute)
\`\`\`wod
10:00
  (EMOM)
    3 Clean & Jerk
\`\`\`

## Tabata / Intervals
Combine rounds with work/rest timers.
\`\`\`wod
(8 Rounds)
  :20 Work
  :10 Rest
  Air Squats
\`\`\`
`
  }
};

export const WeightsAndResistance: Story = {
  args: {
    initialContent: `# Weights and Resistance

Specify weights using \`lb\`, \`kg\`, or \`bw\` (bodyweight).

## Examples
\`\`\`wod
Back Squat 225lb
Deadlift 100kg
Weighted Pullup 20lb
Air Squat bw
\`\`\`

## Percentages
You can indicate percentages (context dependent).
\`\`\`wod
Bench Press @75%
\`\`\`
`
  }
};

export const DistanceAndCardio: Story = {
  args: {
    initialContent: `# Distance and Cardio

Supported units: \`m\`, \`km\`, \`ft\`, \`miles\`.

## Examples
\`\`\`wod
Run 400m
Row 2000m
Bike 10 miles
Swim 500m
\`\`\`
`
  }
};

export const EffortAndTrend: Story = {
  args: {
    initialContent: `# Effort and Trends

## Trends
Use \`^\` to indicate increasing weight or intensity.
\`\`\`wod
Deadlift 1-1-1-1-1 ^
\`\`\`

## Effort / RPE
You can log effort levels or notes.
\`\`\`wod
Run 5km @ Easy Pace
Row 500m @ Max Effort
\`\`\`
`
  }
};

export const ActionsAndRest: Story = {
  args: {
    initialContent: `# Actions and Rest

Special actions are enclosed in brackets \`[]\`.

## Rest
Explicit rest periods.
\`\`\`wod
5 Rounds
  Run 400m
  [Rest] 2:00
\`\`\`

## Transitions / Other
\`\`\`wod
[Walk] 200m
[Setup] 5:00
\`\`\`
`
  }
};
