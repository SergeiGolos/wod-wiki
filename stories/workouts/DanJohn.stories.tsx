import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutDisplay } from './WorkoutDisplayComponent';

const meta: Meta<typeof WorkoutDisplay> = {
  title: 'Workouts/Dan John',
  component: WorkoutDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Dan John Workouts

Training programs from renowned strength coach Dan John.

These workouts focus on fundamental movement patterns and sustainable strength training.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof WorkoutDisplay>;

export const ABC: Story = {
  args: {
    category: 'dan-john',
    workoutName: 'ABC',
    displayName: 'ABC',
  },
};

export const ABCSingleBell: Story = {
  args: {
    category: 'dan-john',
    workoutName: 'ABC_SingleBell',
    displayName: 'ABC Single Bell',
  },
};
