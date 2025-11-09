import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutDisplay } from './WorkoutDisplayComponent';

const meta: Meta<typeof WorkoutDisplay> = {
  title: 'Workouts/CrossFit',
  component: WorkoutDisplay,
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

**Note:** Workout data is loaded from the API server running on port 6007.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof WorkoutDisplay>;

export const Fran: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Fran',
  },
};

export const Annie: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Annie',
  },
};

export const Barbara: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Barbara',
  },
};

export const Chelsea: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Chelsea',
  },
};

export const Cindy: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Cindy',
  },
};

export const Diane: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Diane',
  },
};

export const Elizabeth: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Elizabeth',
  },
};

export const Grace: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Grace',
  },
};

export const Helen: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Helen',
  },
};

export const Isabel: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Isabel',
  },
};

export const Jackie: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Jackie',
  },
};

export const Karen: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Karen',
  },
};

export const Linda: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Linda',
  },
};

export const Mary: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Mary',
  },
};

export const Nancy: Story = {
  args: {
    category: 'crossfit',
    workoutName: 'Nancy',
  },
};
