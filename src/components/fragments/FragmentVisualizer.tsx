import React from 'react';
import { ICodeFragment } from '../../CodeFragment';
import { getFragmentColorClasses } from './fragmentColorMap';
import type { ParseError } from './types';

export interface FragmentVisualizerProps {
  /** Array of fragments to visualize, grouped by type */
  fragments: ICodeFragment[];
  
  /** Optional error state to display instead of fragments */
  error?: ParseError | null;
  
  /** Optional className for container styling */
  className?: string;
}

/**
 * FragmentVisualizer component displays parsed code fragments grouped by type
 * with color-coded visualization.
 */
export const FragmentVisualizer = React.memo<FragmentVisualizerProps>(({ 
  fragments, 
  error, 
  className = '' 
}) => {
  // Error state takes precedence
  if (error) {
    return (
      <div className={`border border-red-300 rounded-lg p-4 bg-red-50 ${className}`}>
        <div className="flex items-start gap-2">
          <span className="text-red-600 font-bold text-lg">⚠️</span>
          <div className="flex-1">
            <div className="font-semibold text-red-800 mb-1">Parse Error</div>
            <div className="text-red-700 text-sm">{error.message}</div>
            {(error.line !== undefined || error.column !== undefined) && (
              <div className="text-red-600 text-xs mt-2">
                {error.line !== undefined && <span>Line {error.line}</span>}
                {error.line !== undefined && error.column !== undefined && <span>, </span>}
                {error.column !== undefined && <span>Column {error.column}</span>}
              </div>
            )}
            {error.excerpt && (
              <pre className="mt-2 p-2 bg-white border border-red-200 rounded text-xs overflow-x-auto">
                {error.excerpt}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!fragments || fragments.length === 0) {
    return (
      <div className={`border border-gray-300 rounded-lg p-4 bg-gray-50 text-center text-gray-500 text-sm ${className}`}>
        No fragments to display
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {fragments.map((fragment, index) => {
        const type = fragment.type || 'unknown';
        const colorClasses = getFragmentColorClasses(type);
        const tokenValue = fragment.image || (typeof fragment.value === 'object' ? JSON.stringify(fragment.value) : String(fragment.value));

        return (
          <span
            key={index}
            className={`inline-block px-2 py-0.5 rounded text-sm font-mono border ${colorClasses} bg-white bg-opacity-60 shadow-sm cursor-help transition-colors hover:bg-opacity-80`}
            title={`${type.toUpperCase()}: ${JSON.stringify(fragment.value, null, 2)}`}
          >
            {tokenValue}
          </span>
        );
      })}
    </div>
  );
});

FragmentVisualizer.displayName = 'FragmentVisualizer';
