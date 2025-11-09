import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect, useCallback } from 'react';
import { 
  searchExercises, 
  fetchExercise, 
  createExercise, 
  updateExercise,
  type ExerciseData,
  type ExerciseSearchResult
} from '../utils/exerciseApi';

/**
 * Exercise Manager Component
 * 
 * Allows users to:
 * - Search exercises with typeahead
 * - View exercise details
 * - Create new exercises
 * - Clone existing exercises
 * - Save exercises back via API
 */
const ExerciseManagerComponent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseSearchResult[]>([]);
  const [selectedExercisePath, setSelectedExercisePath] = useState<string>('');
  const [exerciseData, setExerciseData] = useState<ExerciseData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await searchExercises(searchQuery, 20);
        setSearchResults(response.results);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  // Load exercise when selected
  const loadExercise = useCallback(async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      const data = await fetchExercise(path);
      setExerciseData(data);
      setSelectedExercisePath(path);
      setIsEditing(false);
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search result selection
  const handleSelectExercise = (result: ExerciseSearchResult) => {
    loadExercise(result.path);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle new exercise
  const handleNewExercise = () => {
    setExerciseData({
      name: '',
      force: '',
      level: 'beginner',
      mechanic: '',
      equipment: '',
      primaryMuscles: [],
      secondaryMuscles: [],
      instructions: [''],
      category: 'strength',
    });
    setSelectedExercisePath('');
    setIsCreating(true);
    setIsEditing(true);
    setError(null);
    setSuccessMessage(null);
  };

  // Handle clone exercise
  const handleCloneExercise = () => {
    if (!exerciseData) return;
    
    setExerciseData({
      ...exerciseData,
      name: `${exerciseData.name} (Copy)`,
    });
    setSelectedExercisePath('');
    setIsCreating(true);
    setIsEditing(true);
    setSuccessMessage(null);
  };

  // Handle save exercise
  const handleSaveExercise = async () => {
    if (!exerciseData || !exerciseData.name) {
      setError('Exercise name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (isCreating) {
        const result = await createExercise(exerciseData);
        setSuccessMessage(`Exercise created successfully: ${result.path}`);
        setSelectedExercisePath(result.path);
        setIsCreating(false);
      } else {
        const result = await updateExercise(selectedExercisePath, exerciseData);
        setSuccessMessage(`Exercise updated successfully`);
      }
      
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exercise');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    if (isCreating) {
      setExerciseData(null);
      setSelectedExercisePath('');
      setIsCreating(false);
    } else if (selectedExercisePath) {
      loadExercise(selectedExercisePath);
    }
    setIsEditing(false);
  };

  // Update exercise field
  const updateField = (field: keyof ExerciseData, value: any) => {
    if (!exerciseData) return;
    setExerciseData({ ...exerciseData, [field]: value });
  };

  // Update instruction at index
  const updateInstruction = (index: number, value: string) => {
    if (!exerciseData) return;
    const instructions = [...(exerciseData.instructions || [])];
    instructions[index] = value;
    setExerciseData({ ...exerciseData, instructions });
  };

  // Add instruction
  const addInstruction = () => {
    if (!exerciseData) return;
    const instructions = [...(exerciseData.instructions || []), ''];
    setExerciseData({ ...exerciseData, instructions });
  };

  // Remove instruction
  const removeInstruction = (index: number) => {
    if (!exerciseData) return;
    const instructions = (exerciseData.instructions || []).filter((_, i) => i !== index);
    setExerciseData({ ...exerciseData, instructions });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Exercise Manager</h1>
      <p className="text-gray-600 mb-6">
        Search for exercises, view details, and create or edit exercise definitions.
      </p>

      {/* Search Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
        <div className="flex gap-4 items-start">
          <div className="flex-1 relative">
            <label htmlFor="exercise-search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Exercises
            </label>
            <input
              id="exercise-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search exercises..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.path}
                    onClick={() => handleSelectExercise(result)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{result.name}</div>
                    <div className="text-xs text-gray-500">{result.path}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={handleNewExercise}
            className="mt-7 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            New Exercise
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-red-800">{error}</div>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="text-green-800">{successMessage}</div>
        </div>
      )}

      {/* Exercise Details Section */}
      {exerciseData && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {isCreating ? 'New Exercise' : exerciseData.name}
            </h2>
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleCloneExercise}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    Clone
                  </button>
                </>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={handleSaveExercise}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={exerciseData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md">{exerciseData.name}</div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              {isEditing ? (
                <select
                  value={exerciseData.category || ''}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="strength">Strength</option>
                  <option value="cardio">Cardio</option>
                  <option value="stretching">Stretching</option>
                  <option value="powerlifting">Powerlifting</option>
                  <option value="strongman">Strongman</option>
                  <option value="olympic_weightlifting">Olympic Weightlifting</option>
                  <option value="plyometrics">Plyometrics</option>
                </select>
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md">{exerciseData.category || 'N/A'}</div>
              )}
            </div>

            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              {isEditing ? (
                <select
                  value={exerciseData.level || ''}
                  onChange={(e) => updateField('level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md">{exerciseData.level || 'N/A'}</div>
              )}
            </div>

            {/* Equipment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
              {isEditing ? (
                <input
                  type="text"
                  value={exerciseData.equipment || ''}
                  onChange={(e) => updateField('equipment', e.target.value)}
                  placeholder="e.g., barbell, dumbbell, body only"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md">{exerciseData.equipment || 'N/A'}</div>
              )}
            </div>

            {/* Force */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Force</label>
              {isEditing ? (
                <select
                  value={exerciseData.force || ''}
                  onChange={(e) => updateField('force', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="push">Push</option>
                  <option value="pull">Pull</option>
                  <option value="static">Static</option>
                </select>
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md">{exerciseData.force || 'N/A'}</div>
              )}
            </div>

            {/* Mechanic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mechanic</label>
              {isEditing ? (
                <select
                  value={exerciseData.mechanic || ''}
                  onChange={(e) => updateField('mechanic', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="compound">Compound</option>
                  <option value="isolation">Isolation</option>
                </select>
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md">{exerciseData.mechanic || 'N/A'}</div>
              )}
            </div>
          </div>

          {/* Muscles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Muscles</label>
              {isEditing ? (
                <input
                  type="text"
                  value={(exerciseData.primaryMuscles || []).join(', ')}
                  onChange={(e) => updateField('primaryMuscles', e.target.value.split(',').map(m => m.trim()).filter(Boolean))}
                  placeholder="e.g., chest, triceps"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md">
                  {(exerciseData.primaryMuscles || []).join(', ') || 'N/A'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Muscles</label>
              {isEditing ? (
                <input
                  type="text"
                  value={(exerciseData.secondaryMuscles || []).join(', ')}
                  onChange={(e) => updateField('secondaryMuscles', e.target.value.split(',').map(m => m.trim()).filter(Boolean))}
                  placeholder="e.g., shoulders, core"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md">
                  {(exerciseData.secondaryMuscles || []).join(', ') || 'N/A'}
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
            {(exerciseData.instructions || []).map((instruction, index) => (
              <div key={index} className="flex gap-2 mb-2">
                {isEditing ? (
                  <>
                    <span className="px-3 py-2 text-gray-600">{index + 1}.</span>
                    <textarea
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeInstruction(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded-md flex-1">
                    <span className="font-medium text-gray-700">{index + 1}.</span> {instruction}
                  </div>
                )}
              </div>
            ))}
            {isEditing && (
              <button
                onClick={addInstruction}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                + Add Instruction
              </button>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      {!exerciseData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• <strong>Search:</strong> Type in the search box to find existing exercises</li>
            <li>• <strong>View:</strong> Click on a search result to view exercise details</li>
            <li>• <strong>Edit:</strong> Click "Edit" to modify an existing exercise</li>
            <li>• <strong>Clone:</strong> Click "Clone" to create a copy of an exercise</li>
            <li>• <strong>Create:</strong> Click "New Exercise" to create a new exercise from scratch</li>
            <li>• <strong>Save:</strong> Click "Save" to persist changes via the API</li>
          </ul>
          <p className="text-sm text-blue-800 mt-4">
            <strong>Note:</strong> Make sure the API server is running (npm run api-server)
          </p>
        </div>
      )}
    </div>
  );
};

const meta: Meta<typeof ExerciseManagerComponent> = {
  title: 'API/Exercise Manager',
  component: ExerciseManagerComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Exercise Manager

An interactive story for managing exercise definitions via the API.

## Features

- **Search with Typeahead**: Type to search through 873+ exercises with instant results
- **View Details**: See complete exercise information including muscles, equipment, and instructions
- **Edit Exercises**: Modify existing exercise definitions
- **Create New**: Add new exercises to the database
- **Clone Exercises**: Duplicate existing exercises to create variations
- **Save via API**: All changes are persisted using POST/PUT endpoints

## API Integration

This story demonstrates these exercise API endpoints:
- \`GET /api/exercises/search?q=<query>\` - Search exercises
- \`GET /api/exercises/:path\` - Get exercise details
- \`POST /api/exercises\` - Create new exercise
- \`PUT /api/exercises/:path\` - Update existing exercise

## Usage

1. **Search**: Type in the search box to find exercises (minimum 2 characters)
2. **Select**: Click on a search result to load exercise details
3. **Edit**: Click "Edit" to modify the selected exercise
4. **Clone**: Click "Clone" to create a copy with a new name
5. **New**: Click "New Exercise" to create from scratch
6. **Save**: After editing, click "Save" to persist changes

## Exercise Properties

- **Name**: Unique name for the exercise
- **Category**: Type of exercise (strength, cardio, stretching, etc.)
- **Level**: Difficulty (beginner, intermediate, expert)
- **Equipment**: Required equipment (barbell, dumbbell, body only, etc.)
- **Force**: Movement type (push, pull, static)
- **Mechanic**: Compound or isolation movement
- **Primary Muscles**: Main muscles targeted
- **Secondary Muscles**: Supporting muscles involved
- **Instructions**: Step-by-step guide for performing the exercise

**Note:** Make sure the API server is running (\`npm run api-server\`) for this story to work.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ExerciseManagerComponent>;

/**
 * Main exercise manager story
 */
export const Default: Story = {};
