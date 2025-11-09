import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutDisplay } from './WorkoutDisplayComponent';

const meta: Meta<typeof WorkoutDisplay> = {
  title: 'Workouts/Swimming',
  component: WorkoutDisplay,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Swimming Workouts

Swimming-specific workout programs displayed in the workout journal editor.

These workouts are designed for pool training with structured intervals and rest periods.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof WorkoutDisplay>;

export const BeginnerFriendlySwimming: Story = {
  args: {
    category: 'swimming',
    workoutName: 'BeginnerFriendlySwimming',
    displayName: 'Beginner Friendly Swimming',
  },
};

export const IntermediateSwimming: Story = {
  args: {
    category: 'swimming',
    workoutName: 'IntermediateSwimming',
    displayName: 'Intermediate Swimming',
  },
};

export const AdvancedSwimming: Story = {
  args: {
    category: 'swimming',
    workoutName: 'AdvancedSwimming',
    displayName: 'Advanced Swimming',
  },
};

export const LongDistanceSwimming: Story = {
  args: {
    category: 'swimming',
    workoutName: 'LongDistanceSwimming',
    displayName: 'Long Distance Swimming',
  },
};

export const SprintSwimming: Story = {
  args: {
    category: 'swimming',
    workoutName: 'SprintSwimming',
    displayName: 'Sprint Swimming',
  },
};

export const IndividualMedleySwimming: Story = {
  args: {
    category: 'swimming',
    workoutName: 'IndividualMedleySwimming',
    displayName: 'Individual Medley Swimming',
  },
};
