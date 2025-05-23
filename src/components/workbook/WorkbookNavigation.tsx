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
        "transition-all duration-300 flex flex-col border-r border-gray-200 bg-gray-50",
        isCollapsed ? "w-12" : "w-64"
      )}
    >
      {/* Header with search and collapse button */}
      <div className="flex items-center p-2 border-b border-gray-200">
        {isCollapsed ? (
          <button 
            onClick={onToggleCollapse}
            className="w-full flex justify-center p-2 hover:bg-gray-200 rounded"
          >
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
          </button>
        ) : (
          <>
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-2">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-500" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search workouts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button 
              onClick={onToggleCollapse}
              className="ml-2 p-1 text-gray-500 hover:bg-gray-200 rounded"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Workouts list */}
      {!isCollapsed && (
        <div className="flex-grow overflow-y-auto">
          <ul className="divide-y divide-gray-200">
            {filteredWorkouts.map(workout => (
              <li 
                key={workout.id}
                className={cn(
                  "cursor-pointer hover:bg-gray-100",
                  activeId === workout.id ? "bg-blue-50" : ""
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
                    className="text-gray-400 hover:text-red-500"
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
      <div className="p-2 border-t border-gray-200">
        <button 
          onClick={() => {
            onCreateWorkout();
            refreshWorkouts();
          }}
          className={cn(
            "flex items-center justify-center hover:bg-blue-700 bg-blue-600 text-white rounded py-1 px-2 w-full",
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