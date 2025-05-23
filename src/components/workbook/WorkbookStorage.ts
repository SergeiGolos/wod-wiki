/**
 * WorkbookStorage - Utility for managing workout data in local storage
 */

export interface WorkoutEntry {
  id: string;
  title: string;
  content: string;
  lastModified: number; // timestamp
}

export class WorkbookStorage {
  private readonly STORAGE_KEY = 'wod-wiki-workouts';
  
  /**
   * Load all workouts from local storage
   */
  getWorkouts(): WorkoutEntry[] {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) return [];
      return JSON.parse(storedData) as WorkoutEntry[];
    } catch (error) {
      console.error('Failed to load workouts from storage:', error);
      return [];
    }
  }

  /**
   * Save a workout to local storage
   */
  saveWorkout(workout: WorkoutEntry): void {
    try {
      const workouts = this.getWorkouts();
      
      // Update existing workout or add new one
      const existingIndex = workouts.findIndex(w => w.id === workout.id);
      if (existingIndex >= 0) {
        workouts[existingIndex] = {
          ...workout,
          lastModified: Date.now()
        };
      } else {
        workouts.push({
          ...workout,
          lastModified: Date.now()
        });
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workouts));
    } catch (error) {
      console.error('Failed to save workout to storage:', error);
    }
  }

  /**
   * Delete a workout from local storage
   */
  deleteWorkout(id: string): void {
    try {
      const workouts = this.getWorkouts();
      const filtered = workouts.filter(w => w.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete workout from storage:', error);
    }
  }

  /**
   * Get a single workout by ID
   */
  getWorkout(id: string): WorkoutEntry | undefined {
    try {
      const workouts = this.getWorkouts();
      return workouts.find(w => w.id === id);
    } catch (error) {
      console.error('Failed to get workout from storage:', error);
      return undefined;
    }
  }

  /**
   * Create a new empty workout
   */
  createWorkout(title: string = 'New Workout'): WorkoutEntry {
    const newWorkout: WorkoutEntry = {
      id: `workout-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title,
      content: '',
      lastModified: Date.now()
    };
    
    this.saveWorkout(newWorkout);
    return newWorkout;
  }
}

// Export singleton instance
export const workbookStorage = new WorkbookStorage();