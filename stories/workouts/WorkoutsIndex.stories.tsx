import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutJournal } from '../../src/components/WorkoutJournal';
import * as CrossfitWorkouts from './crossfit';
import * as SwimmingWorkouts from './swimming';
import * as StrongFirstWorkouts from './strongfirst';
import * as DanJonWorkouts from './dan-jon';

/**
 * Workouts Index Story Component
 * 
 * Displays all pre-defined workouts organized by category, each as a separate subpage
 */
const WorkoutsIndexComponent = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Workout Library</h1>
      <p className="text-gray-600 mb-8">
        Browse our collection of pre-defined workouts. Each workout is displayed in its own subpage below.
        Use the Storybook sidebar to navigate between different workouts.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CrossFit Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">CrossFit Workouts</h2>
          <ul className="space-y-2">
            {Object.keys(CrossfitWorkouts).map((name) => (
              <li key={name} className="text-blue-600 hover:text-blue-800">
                <a href={`?path=/story/workouts-crossfit--${name.toLowerCase()}`}>
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Swimming Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Swimming Workouts</h2>
          <ul className="space-y-2">
            {Object.keys(SwimmingWorkouts).map((name) => (
              <li key={name} className="text-blue-600 hover:text-blue-800">
                <a href={`?path=/story/workouts-swimming--${name.toLowerCase().replace(/_/g, '-')}`}>
                  {name.replace(/_/g, ' ')}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* StrongFirst Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">StrongFirst Workouts</h2>
          <ul className="space-y-2">
            {Object.keys(StrongFirstWorkouts).map((name) => (
              <li key={name} className="text-blue-600 hover:text-blue-800">
                <a href={`?path=/story/workouts-strongfirst--${name.toLowerCase().replace(/_/g, '-')}`}>
                  {name.replace(/_/g, ' ')}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Dan John Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Dan John Workouts</h2>
          <ul className="space-y-2">
            {Object.keys(DanJonWorkouts).map((name) => (
              <li key={name} className="text-blue-600 hover:text-blue-800">
                <a href={`?path=/story/workouts-dan-john--${name.toLowerCase().replace(/_/g, '-')}`}>
                  {name.replace(/_/g, ' ')}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">📝 How to Use</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Browse the workouts in the library above</li>
          <li>Click on any workout name to view it in the editor</li>
          <li>Use the Storybook sidebar to navigate between workouts</li>
          <li>Each workout category has its own section in the sidebar</li>
        </ul>
      </div>
    </div>
  );
};

const meta: Meta<typeof WorkoutsIndexComponent> = {
  title: 'Workouts/Index',
  component: WorkoutsIndexComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Workouts Library Index

This page provides an overview of all available workouts in the library, organized by category.

## Categories

- **CrossFit**: Classic CrossFit benchmark workouts (Fran, Annie, Barbara, etc.)
- **Swimming**: Swimming-specific workout programs
- **StrongFirst**: Kettlebell-focused workouts from StrongFirst methodology
- **Dan John**: Training programs from strength coach Dan John

## Navigation

Use the links above or the Storybook sidebar to view individual workouts. Each workout is displayed
in its own subpage where you can see the workout definition and parsed structure.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof WorkoutsIndexComponent>;

/**
 * Main index page showing all workout categories
 */
export const Overview: Story = {};
