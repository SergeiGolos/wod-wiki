import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { fetchWorkoutsByCategory } from '../utils/workoutApi';

/**
 * Workouts Index Story Component
 * 
 * Displays all pre-defined workouts organized by category, each as a separate subpage
 */
const WorkoutsIndexComponent = () => {
  const [workouts, setWorkouts] = useState<{
    crossfit: string[];
    swimming: string[];
    strongfirst: string[];
    'dan-john': string[];
  }>({
    crossfit: [],
    swimming: [],
    strongfirst: [],
    'dan-john': [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllWorkouts = async () => {
      try {
        const [crossfit, swimming, strongfirst, danJohn] = await Promise.all([
          fetchWorkoutsByCategory('crossfit'),
          fetchWorkoutsByCategory('swimming'),
          fetchWorkoutsByCategory('strongfirst'),
          fetchWorkoutsByCategory('dan-john'),
        ]);
        
        setWorkouts({
          crossfit: Object.keys(crossfit),
          swimming: Object.keys(swimming),
          strongfirst: Object.keys(strongfirst),
          'dan-john': Object.keys(danJohn),
        });
      } catch (error) {
        console.error('Error loading workouts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAllWorkouts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading workout library...</div>
      </div>
    );
  }

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
            {workouts.crossfit.map((name) => (
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
            {workouts.swimming.map((name) => (
              <li key={name} className="text-blue-600 hover:text-blue-800">
                <a href={`?path=/story/workouts-swimming--${name.toLowerCase().replace(/_/g, '-')}`}>
                  {name.replace(/([A-Z])/g, ' $1').trim()}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* StrongFirst Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">StrongFirst Workouts</h2>
          <ul className="space-y-2">
            {workouts.strongfirst.map((name) => (
              <li key={name} className="text-blue-600 hover:text-blue-800">
                <a href={`?path=/story/workouts-strongfirst--${name.toLowerCase().replace(/_/g, '-')}`}>
                  {name.replace(/([A-Z])/g, ' $1').trim()}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Dan John Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Dan John Workouts</h2>
          <ul className="space-y-2">
            {workouts['dan-john'].map((name) => (
              <li key={name} className="text-blue-600 hover:text-blue-800">
                <a href={`?path=/story/workouts-dan-john--${name.toLowerCase().replace(/_/g, '-')}`}>
                  {name.replace(/([A-Z])/g, ' $1').trim()}
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
          <li>Workout data is loaded from the API server running on port 6007</li>
        </ul>
      </div>
    </div>
  );
};

const meta: Meta<typeof WorkoutsIndexComponent> = {
  title: 'Workouts/Index',
  component: WorkoutsIndexComponent,
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
