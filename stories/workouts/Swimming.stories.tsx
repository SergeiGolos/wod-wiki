import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutJournal } from '../../src/components/WorkoutJournal';
import * as Workouts from './swimming';

/**
 * Workout Display Component
 */
const WorkoutDisplay = ({ workout, name }: { workout: string; name: string }) => {
  const workoutDate = '2025-01-02';
  if (typeof window !== 'undefined') {
    localStorage.setItem(`workout-journal-${workoutDate}`, workout);
  }
  
  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">{name}</h3>
        <p className="text-sm text-blue-800">
          This is a pre-defined swimming workout. The workout is displayed in the editor below.
        </p>
      </div>
      <WorkoutJournal initialDate={workoutDate} />
    </div>
  );
};

const meta: Meta<typeof WorkoutDisplay> = {
  title: 'Workouts/Swimming',
  component: WorkoutDisplay,
  tags: ['autodocs'],
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
    workout: Workouts.BeginnerFriendlySwimming,
    name: 'Beginner Friendly Swimming',
  },
};
