import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { WorkoutJournal } from '../../src/components/WorkoutJournal';
import { fetchCategories, fetchWorkoutsByCategory } from '../utils/workoutApi';

/**
 * Workout Selector Component
 * 
 * Allows users to:
 * - Browse all available workouts by category
 * - Select a workout from a dropdown
 * - Load the selected workout into the editor
 * - Edit and save the workout
 */
const WorkoutSelectorComponent = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [workouts, setWorkouts] = useState<{ [key: string]: { name: string; workout: string } }>({});
  const [workoutNames, setWorkoutNames] = useState<string[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<string>('');
  const [workoutContent, setWorkoutContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const cats = await fetchCategories();
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategory(cats[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  // Load workouts when category changes
  useEffect(() => {
    if (!selectedCategory) return;

    const loadWorkouts = async () => {
      try {
        setLoading(true);
        const data = await fetchWorkoutsByCategory(selectedCategory);
        setWorkouts(data);
        const names = Object.keys(data);
        setWorkoutNames(names);
        if (names.length > 0) {
          setSelectedWorkout(names[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workouts');
      } finally {
        setLoading(false);
      }
    };
    loadWorkouts();
  }, [selectedCategory]);

  // Load workout content when selection changes
  useEffect(() => {
    if (!selectedWorkout || !workouts[selectedWorkout]) return;

    const workout = workouts[selectedWorkout];
    setWorkoutContent(workout.workout);
    
    // Pre-fill localStorage with the workout
    const workoutDate = '2025-01-01';
    if (typeof window !== 'undefined') {
      localStorage.setItem(`workout-journal-${workoutDate}`, workout.workout);
    }
  }, [selectedWorkout, workouts]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setSelectedWorkout('');
    setWorkoutContent('');
  };

  const handleWorkoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWorkout(e.target.value);
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading workout library...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>
          <div className="text-lg text-red-600 mb-2">Error: {error}</div>
          <div className="text-sm text-gray-600">
            Make sure the API server is running (npm run api-server)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Workout Selector</h1>
        <p className="text-gray-600 mb-6">
          Select a workout from the dropdown below to load it into the editor. You can edit and save the workout to a different date.
        </p>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Selector */}
            <div>
              <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Category
              </label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Workout Selector */}
            <div>
              <label htmlFor="workout-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Workout
              </label>
              <select
                id="workout-select"
                value={selectedWorkout}
                onChange={handleWorkoutChange}
                disabled={!selectedCategory || workoutNames.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {workoutNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Workout Info */}
          {selectedWorkout && workouts[selectedWorkout] && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                {workouts[selectedWorkout].name}
              </h3>
              <p className="text-sm text-blue-800">
                <strong>Category:</strong> {selectedCategory}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                This workout has been loaded into the editor below. You can edit it and save it to your journal.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Workout Journal Editor */}
      {workoutContent && (
        <div className="border-t border-gray-200 pt-6">
          <WorkoutJournal initialDate="2025-01-01" />
        </div>
      )}
    </div>
  );
};

const meta: Meta<typeof WorkoutSelectorComponent> = {
  title: 'API/Workout Selector',
  component: WorkoutSelectorComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Workout Selector

An interactive story that allows you to browse and load workouts from the API.

## Features

- **Category Selection**: Choose from available workout categories (CrossFit, Swimming, StrongFirst, Dan John)
- **Workout Dropdown**: Select a specific workout from the chosen category
- **Live Loading**: Selected workout is automatically loaded into the editor
- **Edit & Save**: Modify the workout and save it to your journal

## API Integration

This story demonstrates the workout API endpoints:
- \`GET /api/workouts/categories\` - List all categories
- \`GET /api/workouts/:category\` - Get all workouts in a category
- \`GET /api/workouts/:category/:name\` - Get a specific workout

## Usage

1. Select a category from the first dropdown
2. Select a workout from the second dropdown
3. The workout will load into the editor below
4. Edit the workout as needed
5. Use the "Save" button to save it to your journal

**Note:** Make sure the API server is running (\`npm run api-server\`) for this story to work.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof WorkoutSelectorComponent>;

/**
 * Main workout selector story
 */
export const Default: Story = {};
