/**
 * Workout API Client
 * 
 * Provides utilities for fetching workout data from the API server
 * that runs alongside Storybook in development mode.
 */

import { API_BASE_URL } from '../../src/config/api';

export interface WorkoutData {
  name: string;
  workout: string;
}

export interface WorkoutsResponse {
  [key: string]: WorkoutData;
}

/**
 * Fetch all workouts for a given category
 */
export async function fetchWorkoutsByCategory(category: string): Promise<WorkoutsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/workouts/${category}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${category} workouts: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${category} workouts:`, error);
    throw error;
  }
}

/**
 * Fetch a specific workout by category and name
 */
export async function fetchWorkout(category: string, name: string): Promise<WorkoutData> {
  try {
    const response = await fetch(`${API_BASE_URL}/workouts/${category}/${name}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch workout ${category}/${name}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching workout ${category}/${name}:`, error);
    throw error;
  }
}

/**
 * Fetch all available workout categories
 */
export async function fetchCategories(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/workouts/categories`);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }
    const data = await response.json();
    return data.categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

/**
 * Check if API server is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}
