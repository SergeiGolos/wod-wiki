import React, { useState, useEffect, useRef } from 'react';
import { ExerciseIndexManager } from '../../editor/ExerciseIndexManager';
import { ExercisePathEntry } from '../../tools/ExercisePathIndexer';

interface SmartStatementInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SmartStatementInput: React.FC<SmartStatementInputProps> = ({
  value,
  onChange,
  onCommit,
  onCancel,
  placeholder,
  autoFocus
}) => {
  const [suggestions, setSuggestions] = useState<ExercisePathEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Simple heuristic: only suggest if the last word looks like an exercise start
      // or if the whole input is being typed.
      // For WODs, lines often start with numbers "21 Thrusters".
      // We want to suggest "Thrusters" when user types "Thr".
      
      const words = value.split(' ');
      const lastWord = words[words.length - 1];
      
      if (lastWord.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const manager = ExerciseIndexManager.getInstance();
      if (manager.hasProvider()) {
          const results = await manager.searchExercises(lastWord, 5);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
          setSelectedIndex(0);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        applySuggestion(suggestions[selectedIndex]);
      } else {
        onCommit();
      }
    } else if (e.key === 'Escape') {
      if (showSuggestions) {
        setShowSuggestions(false);
      } else {
        onCancel();
      }
    } else if (e.key === 'ArrowDown') {
      if (showSuggestions) {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      if (showSuggestions) {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      }
    }
  };

  const applySuggestion = (suggestion: ExercisePathEntry) => {
    const words = value.split(' ');
    words.pop(); // Remove partial word
    words.push(suggestion.name);
    const newValue = words.join(' ') + ' ';
    onChange(newValue);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.path}
              className={`px-3 py-2 text-sm cursor-pointer ${
                index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
              }`}
              onClick={() => applySuggestion(suggestion)}
            >
              {suggestion.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
