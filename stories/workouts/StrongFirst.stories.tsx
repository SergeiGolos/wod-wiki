import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutDisplay } from './WorkoutDisplayComponent';

const meta: Meta<typeof WorkoutDisplay> = {
  title: 'Workouts/StrongFirst',
  component: WorkoutDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# StrongFirst Workouts

Kettlebell-focused workouts from the StrongFirst methodology.

These workouts emphasize strength, power, and proper kettlebell technique.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof WorkoutDisplay>;

export const SimpleAndSinister: Story = {
  args: {
    category: 'strongfirst',
    workoutName: 'SimpleAndSinister',
    displayName: 'Simple and Sinister',
  },
};

export const KBAxeHeavy: Story = {
  args: {
    category: 'strongfirst',
    workoutName: 'KBAxeHeavy',
    displayName: 'KB Axe Heavy',
  },
};

export const KBAxeLite: Story = {
  args: {
    category: 'strongfirst',
    workoutName: 'KBAxeLite',
    displayName: 'KB Axe Lite',
  },
};
