/**
 * Exercise API Client
 * 
 * Provides utilities for fetching and managing exercise data from the API server
 * that runs alongside Storybook in development mode.
 */

// API server runs on port 6007 during development
const API_BASE_URL = 'http://localhost:6007/api';

export interface ExerciseData {
  name: string;
  force?: string;
  level?: string;
  mechanic?: string;
  equipment?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  category?: string;
}

export interface ExerciseSearchResult {
  name: string;
  path: string;
  searchTerms: string[];
}

export interface ExerciseSearchResponse {
  results: ExerciseSearchResult[];
  query: string;
  count: number;
}

/**
 * Search exercises by query string
 */
export async function searchExercises(query: string, limit: number = 50): Promise<ExerciseSearchResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/exercises/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to search exercises: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching exercises:', error);
    throw error;
  }
}

/**
 * Fetch a specific exercise by path
 */
export async function fetchExercise(exercisePath: string): Promise<ExerciseData> {
  try {
    const response = await fetch(`${API_BASE_URL}/exercises/${encodeURIComponent(exercisePath)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch exercise: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching exercise ${exercisePath}:`, error);
    throw error;
  }
}

/**
 * Create a new exercise
 */
export async function createExercise(exerciseData: ExerciseData): Promise<{ success: boolean; path: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exerciseData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to create exercise: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating exercise:', error);
    throw error;
  }
}

/**
 * Update an existing exercise
 */
export async function updateExercise(exercisePath: string, exerciseData: ExerciseData): Promise<{ success: boolean; path: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/exercises/${encodeURIComponent(exercisePath)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exerciseData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to update exercise: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating exercise ${exercisePath}:`, error);
    throw error;
  }
}
