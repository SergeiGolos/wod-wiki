import React, { useState, useEffect, useRef } from 'react';
import { WodWiki } from '../editor/WodWiki';
import { IScript } from '../WodScript';
import { useTheme } from './theme/ThemeProvider';

interface WorkoutJournalProps {
  /** Optional initial date (defaults to today) */
  initialDate?: string;
}

/**
 * WorkoutJournal component for creating and managing daily workout entries
 * 
 * Features:
 * - Date-based workout storage using localStorage
 * - WodWiki editor integration for workout editing
 * - Manual save with Save button
 * - Load existing workouts by date
 * - Half-page width layout
 */
export const WorkoutJournal: React.FC<WorkoutJournalProps> = ({ initialDate }) => {
  const { theme } = useTheme();
  const [monacoTheme, setMonacoTheme] = useState('vs');
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [workoutContent, setWorkoutContent] = useState<string>('');
  const [script, setScript] = useState<IScript | undefined>(undefined);
  const editorRef = useRef<any>(null);
  const currentContentRef = useRef<string>('');

  // Sync Monaco theme with global theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      setMonacoTheme(isDark ? 'vs-dark' : 'vs');
    };

    updateTheme();

    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  // Load workout from localStorage when date changes
  useEffect(() => {
    const storageKey = `workout-journal-${selectedDate}`;
    const savedWorkout = localStorage.getItem(storageKey);
    if (savedWorkout) {
      setWorkoutContent(savedWorkout);
      currentContentRef.current = savedWorkout;
    } else {
      setWorkoutContent('');
      currentContentRef.current = '';
    }
  }, [selectedDate]);

  // Track editor content changes
  const handleValueChange = (newScript?: IScript) => {
    setScript(newScript);
  };

  // Handle editor mount to capture reference
  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
    // Listen to content changes
    editor.onDidChangeModelContent(() => {
      currentContentRef.current = editor.getValue();
    });
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // Handle save with current editor content
  const handleSave = () => {
    const content = editorRef.current?.getValue() || currentContentRef.current;
    const storageKey = `workout-journal-${selectedDate}`;
    localStorage.setItem(storageKey, content);
    alert('Workout saved!');
  };

  // Handle new workout
  const handleNew = () => {
    const content = editorRef.current?.getValue() || currentContentRef.current;
    if (content && !confirm('Clear current workout and create a new one?')) {
      return;
    }
    setWorkoutContent('');
    setScript(undefined);
    currentContentRef.current = '';
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Workout Journal</h2>
        
        <div className="flex gap-4 items-center mb-4">
          <div className="flex-1">
            <label htmlFor="workout-date" className="block text-sm font-medium text-gray-700 mb-1">
              Workout Date
            </label>
            <input
              id="workout-date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2 pt-6">
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              New
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg shadow-md overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
          <h4 className="text-sm font-semibold text-gray-700">
            Workout for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h4>
        </div>
        <div className="bg-white" style={{ minHeight: '400px' }}>
          <WodWiki 
            id={`workout-editor-${selectedDate}`}
            code={workoutContent}
            onValueChange={handleValueChange}
            onMount={handleEditorMount}
            theme={monacoTheme}
          />
        </div>
      </div>

      {script && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Parsed Workout</h4>
          <pre className="text-xs text-gray-600 overflow-auto max-h-60">
            {JSON.stringify(script, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
