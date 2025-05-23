import React, { useState, useEffect, useCallback } from 'react';
import { WorkbookNavigation } from './WorkbookNavigation';
import { WorkbookPage } from './WorkbookPage';
import { WorkoutEntry, workbookStorage } from './WorkbookStorage';
import { ThemeToggle } from '@/components/ThemeToggle';

export const Workbook: React.FC = () => {
  const [activeWorkout, setActiveWorkout] = useState<WorkoutEntry | null>(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Load initial workout when component mounts
  useEffect(() => {
    const workouts = workbookStorage.getWorkouts();
    
    // Create a default workout if no workouts exist
    if (workouts.length === 0) {
      const defaultWorkout = workbookStorage.createWorkout('My First Workout');
      setActiveWorkout(defaultWorkout);
    } else {
      // Load the most recent workout
      const mostRecent = workouts.sort((a, b) => b.lastModified - a.lastModified)[0];
      setActiveWorkout(mostRecent);
    }
  }, []);

  // Create a new workout
  const handleCreateWorkout = () => {
    const newWorkout = workbookStorage.createWorkout();
    setActiveWorkout(newWorkout);
    setIsNavCollapsed(false); // Expand navigation when creating a new workout
  };

  // Delete a workout
  const handleDeleteWorkout = (id: string) => {
    workbookStorage.deleteWorkout(id);
    
    // If the active workout was deleted, select another one
    if (activeWorkout?.id === id) {
      const remainingWorkouts = workbookStorage.getWorkouts();
      if (remainingWorkouts.length > 0) {
        setActiveWorkout(remainingWorkouts[0]);
      } else {
        const newWorkout = workbookStorage.createWorkout();
        setActiveWorkout(newWorkout);
      }
    }
  };

  // Debounced save function to prevent excessive storage operations
  const saveWorkout = useCallback((updatedWorkout: WorkoutEntry) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeoutId = setTimeout(() => {
      workbookStorage.saveWorkout(updatedWorkout);
      console.log(`Saved workout: ${updatedWorkout.title}`);
    }, 500); // 500ms debounce
    
    setSaveTimeout(timeoutId);
    
    // Update state immediately for UI responsiveness
    setActiveWorkout(updatedWorkout);
  }, [saveTimeout]);

  // Update workout title
  const handleTitleChange = (title: string) => {
    if (!activeWorkout) return;
    
    const updatedWorkout = { ...activeWorkout, title };
    saveWorkout(updatedWorkout);
  };

  // Update workout content
  const handleContentChange = (content: string) => {
    if (!activeWorkout) return;
    
    const updatedWorkout = { ...activeWorkout, content };
    saveWorkout(updatedWorkout);
  };

  // Toggle navigation collapse
  const handleToggleNav = () => {
    setIsNavCollapsed(!isNavCollapsed);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-journal-paper dark:bg-journal-paper-dark text-journal-ink dark:text-journal-ink-light transition-colors duration-200">
      {/* Navigation sidebar */}
      <WorkbookNavigation
        activeId={activeWorkout?.id}
        onSelectWorkout={setActiveWorkout}
        onCreateWorkout={handleCreateWorkout}
        onDeleteWorkout={handleDeleteWorkout}
        isCollapsed={isNavCollapsed}
        onToggleCollapse={handleToggleNav}
      />

      {/* Main content area */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {/* Theme toggle in the top-right corner */}
        <div className="absolute top-2 right-4 z-10">
          <ThemeToggle />
        </div>
        
        {activeWorkout ? (
          <WorkbookPage
            workout={activeWorkout}
            onTitleChange={handleTitleChange}
            onContentChange={handleContentChange}
          />
        ) : (
          <div className="flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
};