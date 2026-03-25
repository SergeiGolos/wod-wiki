import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import type { QueryOrganismProps } from './types';

export const FuzzySearchQuery: React.FC<QueryOrganismProps> = ({ onQueryChange, initialQuery }) => {
  const [text, setText] = useState(initialQuery?.text || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      onQueryChange({ ...initialQuery, text });
    }, 300);
    return () => clearTimeout(timer);
  }, [text, onQueryChange, initialQuery]);

  return (
    <div className="flex items-center px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
      <MagnifyingGlassIcon className="size-5 text-muted-foreground mr-3" />
      <input
        type="text"
        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground sm:text-lg font-medium"
        placeholder="Search workouts, results, or notes..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
    </div>
  );
};
