import type { Meta, StoryObj } from '@storybook/react'
import { CollectionWorkoutsList } from '../../../playground/src/views/queriable-list/CollectionWorkoutsList'
import type { WorkoutItem } from '../../../playground/src/App'

const meta = {
  title: 'catalog/templates/CollectionWorkoutsList',
  component: CollectionWorkoutsList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Filtered workout list for a collection category. ' +
          'Wraps QueriableListView + FuzzySearchQuery — type in the search box to filter by name.',
      },
    },
  },

} satisfies Meta<typeof CollectionWorkoutsList>

export default meta
type Story = StoryObj<typeof meta>

// ── Sample workout data ───────────────────────────────────────────────────────

function makeWorkout(id: string, name: string, category: string, content: string): WorkoutItem {
  return { id, name, category, content }
}

const girlWorkouts: WorkoutItem[] = [
  makeWorkout('fran', 'Fran', 'girls', '(21-15-9)\n  Thrusters 95lb\n  Pullups'),
  makeWorkout('cindy', 'Cindy', 'girls', '20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats'),
  makeWorkout('diane', 'Diane', 'girls', '(21-15-9)\n  Deadlifts 225lb\n  Handstand Pushups'),
  makeWorkout('grace', 'Grace', 'girls', '30 Clean and Jerk 135lb'),
  makeWorkout('helen', 'Helen', 'girls', '3x\n  400m Run\n  21 KB Swings 53lb\n  12 Pullups'),
  makeWorkout('isabel', 'Isabel', 'girls', '30 Snatches 135lb'),
]

const heroWorkouts: WorkoutItem[] = [
  makeWorkout('murph', 'Murph', 'heroes', '1 mile Run\n100 Pullups\n200 Pushups\n300 Air Squats\n1 mile Run'),
  makeWorkout('j-t', 'J.T.', 'heroes', '(21-15-9)\n  HSPU\n  Ring Dips\n  Pushups'),
  makeWorkout('arnie', 'Arnie', 'heroes', '21-15-9\n  Thrusters 135lb\n  Bar MU\n  Box Jumps 30"'),
]

const emptyCategory: WorkoutItem[] = []

// ── Stories ───────────────────────────────────────────────────────────────────

export const GirlsCollection: Story = {
  args: {
    category: 'girls',
    workoutItems: girlWorkouts,
    onSelect: () => {},
  },
}

export const HeroesCollection: Story = {
  args: {
    category: 'heroes',
    workoutItems: heroWorkouts,
    onSelect: () => {},
  },
}

export const EmptyCollection: Story = {
  args: {
    category: 'empty',
    workoutItems: emptyCategory,
    onSelect: () => {},
  },
}

export const MixedCategoryItems: Story = {
  name: 'Filtered (only matching category shown)',
  args: {
    category: 'girls',
    workoutItems: [...girlWorkouts, ...heroWorkouts],
    onSelect: () => {},
  },
}
