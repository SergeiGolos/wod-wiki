import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutJournal } from '../../src/components/WorkoutJournal';
import * as Workouts from './strongfirst';

/**
 * Workout Display Component
 */
const WorkoutDisplay = ({ workout, name }: { workout: string; name: string }) => {
  const workoutDate = '2025-01-03';
  if (typeof window !== 'undefined') {
    localStorage.setItem(`workout-journal-${workoutDate}`, workout);
  }
  
  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">{name}</h3>
        <p className="text-sm text-blue-800">
          This is a pre-defined StrongFirst workout. The workout is displayed in the editor below.
        </p>
      </div>
      <WorkoutJournal initialDate={workoutDate} />
    </div>
  );
};

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
    workout: Workouts.SimpleAndSinister,
    name: 'Simple and Sinister',
  },
};

export const KBAxeHeavy: Story = {
  args: {
    workout: Workouts.KBAxeHeavy,
    name: 'KB Axe Heavy',
  },
};

export const KBAxeLite: Story = {
  args: {
    workout: Workouts.KBAxeLite,
    name: 'KB Axe Lite',
  },
};
