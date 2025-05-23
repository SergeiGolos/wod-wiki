import React, { useState, useEffect, useRef } from 'react';
import { WorkoutEntry, workbookStorage } from './WorkbookStorage';
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from "@/core/utils";

interface WorkbookNavigationProps {
  activeId?: string;
  onSelectWorkout: (workout: WorkoutEntry) => void;
  onCreateWorkout: () => void;
  onDeleteWorkout: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const WorkbookNavigation: React.FC<WorkbookNavigationProps> = ({
  activeId,
  onSelectWorkout,
  onCreateWorkout,
  onDeleteWorkout,
  isCollapsed,
  onToggleCollapse
}) => {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Function to refresh the workouts list
  const refreshWorkouts = () => {
    setWorkouts(workbookStorage.getWorkouts());
    setRefreshCounter(prev => prev + 1);
  };

  // Load workouts from storage
  useEffect(() => {
    refreshWorkouts();
  }, [activeId]); // Refresh when active workout changes

  // Focus search input when nav expands
  useEffect(() => {
    if (!isCollapsed && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isCollapsed]);

  // Filter workouts based on search term
  const filteredWorkouts = workouts.filter(workout => 
    workout.title.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.lastModified - a.lastModified); // Most recent first

  return (
    <div 
      className={cn(
        "transition-all duration-300 flex flex-col border-r border-solarized-base2 dark:border-solarized-base02 bg-solarized-base3 dark:bg-solarized-base03 bg-paper-texture dark:bg-paper-texture-dark",
        isCollapsed ? "w-12" : "w-64"
      )}
    >
      {/* Header with search and collapse button */}
      <div className="flex items-center p-2 border-b border-solarized-base2 dark:border-solarized-base02">
        {isCollapsed ? (
          <button 
            onClick={onToggleCollapse}
            className="w-full flex justify-center p-2 hover:bg-solarized-base2 dark:hover:bg-solarized-base02 rounded-journal"
          >
            <MagnifyingGlassIcon className="h-5 w-5 text-solarized-base00 dark:text-solarized-base0" />
          </button>
        ) : (
          <>
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-2">
                <MagnifyingGlassIcon className="h-4 w-4 text-solarized-base00 dark:text-solarized-base0" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search workouts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-sm border border-solarized-base1 dark:border-solarized-base01 rounded-journal focus:ring-solarized-blue focus:border-solarized-blue bg-white dark:bg-solarized-base02 text-journal-ink dark:text-journal-ink-light"
              />
            </div>
            <button 
              onClick={onToggleCollapse}
              className="ml-2 p-1 text-solarized-base00 dark:text-solarized-base0 hover:bg-solarized-base2 dark:hover:bg-solarized-base02 rounded-journal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Workouts list */}
      {!isCollapsed && (
        <div className="flex-grow overflow-y-auto">
          <ul className="divide-y divide-solarized-base2 dark:divide-solarized-base02">
            {filteredWorkouts.map(workout => (
              <li 
                key={workout.id}
                className={cn(
                  "cursor-pointer hover:bg-solarized-base2 dark:hover:bg-solarized-base02",
                  activeId === workout.id ? "bg-solarized-base2 dark:bg-solarized-base02" : ""
                )}
                onClick={() => onSelectWorkout(workout)}
              >
                <div className="px-4 py-2 flex justify-between items-center">
                  <span className="text-sm truncate">{workout.title}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering onSelectWorkout
                      if (confirm(`Delete "${workout.title}"?`)) {
                        onDeleteWorkout(workout.id);
                        refreshWorkouts();
                      }
                    }}
                    className="text-solarized-base00 dark:text-solarized-base0 hover:text-solarized-red"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New workout button */}
      <div className="p-2 border-t border-solarized-base2 dark:border-solarized-base02">
        <button 
          onClick={() => {
            onCreateWorkout();
            refreshWorkouts();
          }}
          className={cn(
            "flex items-center justify-center hover:bg-solarized-green bg-solarized-green text-white rounded-journal py-1 px-2 w-full transition-colors",
            isCollapsed ? "px-0" : ""
          )}
        >
          <PlusIcon className="h-5 w-5" />
          {!isCollapsed && <span className="ml-1">New Workout</span>}
        </button>
      </div>
    </div>
  );
};