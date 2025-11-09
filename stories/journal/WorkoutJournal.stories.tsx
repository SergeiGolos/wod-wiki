import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutJournal } from '../../src/components/WorkoutJournal';

const meta: Meta<typeof WorkoutJournal> = {
  title: 'Journal/Workout Journal',
  component: WorkoutJournal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Workout Journal Component

A date-based workout journal that uses localStorage to save and load daily workouts.

## Features

- **Date Selection**: Choose any date to view or edit workouts
- **localStorage Persistence**: Automatically saves workouts with date-based keys
- **WodWiki Editor**: Full-featured workout editor with syntax highlighting
- **Half-Page Layout**: Designed to take up half the page width (max-w-2xl)
- **New/Save Controls**: Manual save and new workout creation

## Usage

1. Select a date using the date picker
2. Type your workout in the editor using WodWiki syntax
3. Click "Save" to save to localStorage
4. Click "New" to clear and start a new workout
5. Change dates to load different workouts

## localStorage Keys

Workouts are stored with keys in the format: \`workout-journal-YYYY-MM-DD\`
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof WorkoutJournal>;

/**
 * Default story - shows the journal with today's date
 */
export const Default: Story = {
  args: {},
};

/**
 * With Initial Date - opens to a specific date
 */
export const WithInitialDate: Story = {
  args: {
    initialDate: '2025-10-01',
  },
};

/**
 * Example showing a pre-filled workout (you'll need to manually add this to localStorage in the browser)
 */
export const PrefilledWorkout: Story = {
  args: {
    initialDate: '2025-10-12',
  },
  render: (args) => {
    // Pre-fill localStorage with sample workout
    if (typeof window !== 'undefined') {
      const sampleWorkout = `AMRAP 20:00
  5 Pull-Ups
  10 Push-Ups
  15 Air Squats

Notes:
- Focus on form
- Scale as needed`;
      localStorage.setItem('workout-journal-2025-10-12', sampleWorkout);
    }
    return <WorkoutJournal {...args} />;
  },
};
