import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutJournal } from '../../src/components/WorkoutJournal';
import * as Workouts from './crossfit';

/**
 * Workout Display Component
 * Shows a workout in the journal editor with a specific date
 */
const WorkoutDisplay = ({ workout, name }: { workout: string; name: string }) => {
  // Pre-fill localStorage with the workout
  const workoutDate = '2025-01-01'; // Fixed date for display
  if (typeof window !== 'undefined') {
    localStorage.setItem(`workout-journal-${workoutDate}`, workout);
  }
  
  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">{name}</h3>
        <p className="text-sm text-blue-800">
          This is a pre-defined CrossFit benchmark workout. The workout is displayed in the editor below.
          You can edit and save it to a different date if needed.
        </p>
      </div>
      <WorkoutJournal initialDate={workoutDate} />
    </div>
  );
};

const meta: Meta<typeof WorkoutDisplay> = {
  title: 'Workouts/CrossFit',
  component: WorkoutDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# CrossFit Benchmark Workouts

Classic CrossFit benchmark workouts displayed in the workout journal editor.

Each story below shows a different CrossFit workout pre-loaded into the editor.
These are famous workouts used to benchmark fitness progress.

## The Girls
Many CrossFit benchmark workouts are named after women (Fran, Annie, Barbara, etc.).
These workouts are designed to be intense and repeatable, allowing athletes to track
their progress over time.

## Usage
- View any workout by selecting it from the sidebar
- Edit the workout in the editor
- Save it to a different date if you want to track when you completed it
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof WorkoutDisplay>;

export const Fran: Story = {
  args: {
    workout: Workouts.Fran,
    name: 'Fran',
  },
};

export const Annie: Story = {
  args: {
    workout: Workouts.Annie,
    name: 'Annie',
  },
};

export const Barbara: Story = {
  args: {
    workout: Workouts.Barbara,
    name: 'Barbara',
  },
};

export const Chelsea: Story = {
  args: {
    workout: Workouts.Chelsea,
    name: 'Chelsea',
  },
};

export const Cindy: Story = {
  args: {
    workout: Workouts.Cindy,
    name: 'Cindy',
  },
};

export const Diane: Story = {
  args: {
    workout: Workouts.Diane,
    name: 'Diane',
  },
};

export const Elizabeth: Story = {
  args: {
    workout: Workouts.Elizabeth,
    name: 'Elizabeth',
  },
};

export const Grace: Story = {
  args: {
    workout: Workouts.Grace,
    name: 'Grace',
  },
};

export const Helen: Story = {
  args: {
    workout: Workouts.Helen,
    name: 'Helen',
  },
};

export const Isabel: Story = {
  args: {
    workout: Workouts.Isabel,
    name: 'Isabel',
  },
};

export const Jackie: Story = {
  args: {
    workout: Workouts.Jackie,
    name: 'Jackie',
  },
};

export const Karen: Story = {
  args: {
    workout: Workouts.Karen,
    name: 'Karen',
  },
};

export const Linda: Story = {
  args: {
    workout: Workouts.Linda,
    name: 'Linda',
  },
};

export const Mary: Story = {
  args: {
    workout: Workouts.Mary,
    name: 'Mary',
  },
};

export const Nancy: Story = {
  args: {
    workout: Workouts.Nancy,
    name: 'Nancy',
  },
};
