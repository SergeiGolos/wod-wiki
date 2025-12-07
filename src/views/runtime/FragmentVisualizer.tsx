import React from 'react';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { getFragmentColorClasses } from './fragmentColorMap';
import { cn } from '../../lib/utils';
import { VisualizerSize } from '../../core/models/DisplayItem';
import type { ParseError } from './types';

export interface FragmentVisualizerProps {
  /** Array of fragments to visualize, grouped by type */
  fragments: ICodeFragment[];
  
  /** Optional error state to display instead of fragments */
  error?: ParseError | null;
  
  /** Optional className for container styling */
  className?: string;

  /** Display size variant @default 'normal' */
  size?: VisualizerSize;

  /** @deprecated Use size='compact' instead */
  compact?: boolean;
}

/**
 * Get icon/emoji for fragment type
 */
export function getFragmentIcon(type: string): string | null {
  const iconMap: Record<string, string> = {
    'timer': '⏱️',
    'duration': '⏱️',
    'rounds': '🔄',
    'rep': '×',
    'reps': '×',
    'resistance': '💪',
    'weight': '💪',
    'distance': '📏',
    'action': '▶️',
    'rest': '⏸️',
    'effort': '🏃',
    'lap': '+',
    'increment': '↕️',
    'text': '📝',
  };
  
  return iconMap[type.toLowerCase()] || null;
}

/**
 * FragmentVisualizer component displays parsed code fragments grouped by type
 * with color-coded visualization and icons.
 */
export const FragmentVisualizer = React.memo<FragmentVisualizerProps>(({ 
  fragments, 
  error, 
  className = '',
  size: sizeProp = 'normal',
  compact: compactProp
}) => {
  // Backward compatibility
  const size = compactProp ? 'compact' : sizeProp;

  // Error state takes precedence
  if (error) {
    return (
      <div className={`border border-destructive/50 rounded-lg p-4 bg-destructive/10 ${className}`}>
        <div className="flex items-start gap-2">
          <span className="text-destructive font-bold text-lg">⚠️</span>
          <div className="flex-1">
            <div className="font-semibold text-destructive mb-1">Parse Error</div>
            <div className="text-destructive/90 text-sm">{error.message}</div>
            {(error.line !== undefined || error.column !== undefined) && (
              <div className="text-destructive/80 text-xs mt-2">
                {error.line !== undefined && <span>Line {error.line}</span>}
                {error.line !== undefined && error.column !== undefined && <span>, </span>}
                {error.column !== undefined && <span>Column {error.column}</span>}
              </div>
            )}
            {error.excerpt && (
              <pre className="mt-2 p-2 bg-background border border-destructive/20 rounded text-xs overflow-x-auto text-foreground">
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
      <div className={`border border-border rounded-lg p-4 bg-muted/20 text-center text-muted-foreground text-sm ${className}`}>
        No fragments to display
      </div>
    );
  }

  const styles = {
    compact: {
      padding: 'px-1 py-0',
      text: 'text-[10px] leading-tight',
      icon: 'text-xs'
    },
    normal: {
      padding: 'px-2 py-0.5',
      text: 'text-sm',
      icon: 'text-base leading-none'
    },
    focused: {
      padding: 'px-2.5 py-1',
      text: 'text-base',
      icon: 'text-lg leading-none'
    }
  };

  const currentStyle = styles[size];

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {fragments.map((fragment, index) => {
        const type = fragment.type || 'unknown';
        const colorClasses = getFragmentColorClasses(type);
        const tokenValue = fragment.image || (typeof fragment.value === 'object' ? JSON.stringify(fragment.value) : String(fragment.value));
        const icon = getFragmentIcon(type);

        return (
          <span
            key={index}
            className={cn(
              `inline-flex items-center gap-1 rounded font-mono border ${colorClasses} bg-opacity-60 shadow-sm cursor-help transition-colors hover:bg-opacity-80`,
              currentStyle.padding,
              currentStyle.text
            )}
            title={`${type.toUpperCase()}: ${JSON.stringify(fragment.value, null, 2)}`}
          >
            {icon && <span className={currentStyle.icon}>{icon}</span>}
            <span>{tokenValue}</span>
          </span>
        );
      })}
    </div>
  );
});

FragmentVisualizer.displayName = 'FragmentVisualizer';
