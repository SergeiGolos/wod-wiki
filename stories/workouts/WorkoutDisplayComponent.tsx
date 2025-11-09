import { WorkoutJournal } from '../../src/components/WorkoutJournal';
import { useEffect, useState } from 'react';
import { fetchWorkout } from '../utils/workoutApi';

/**
 * Reusable Workout Display Component
 * Fetches and shows a workout in the journal editor
 */
export const WorkoutDisplay = ({ 
  category, 
  workoutName, 
  displayName 
}: { 
  category: string;
  workoutName: string;
  displayName?: string;
}) => {
  const [workout, setWorkout] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadWorkout = async () => {
      try {
        setLoading(true);
        const data = await fetchWorkout(category, workoutName);
        setWorkout(data.workout);
        
        // Pre-fill localStorage with the workout
        const workoutDate = '2025-01-01';
        if (typeof window !== 'undefined') {
          localStorage.setItem(`workout-journal-${workoutDate}`, data.workout);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workout');
      } finally {
        setLoading(false);
      }
    };
    
    loadWorkout();
  }, [category, workoutName]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading workout...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
        <div className="text-sm text-gray-600 mt-2">
          Make sure the API server is running (npm run api-server)
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">{displayName || workoutName}</h3>
        <p className="text-sm text-blue-800">
          This workout is loaded from the API server. You can edit and save it to a different date if needed.
        </p>
      </div>
      <WorkoutJournal initialDate="2025-01-01" />
    </div>
  );
};
