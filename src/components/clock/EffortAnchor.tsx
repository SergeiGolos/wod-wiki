/** @jsxImportSource react */
import React from 'react';
import { cn } from '@/core/utils';
import { RuntimeSpan } from '@/core/RuntimeSpan';

export interface EffortDisplayProps {
  clock?: RuntimeSpan | undefined;  
  className?: string;
}

// Component for displaying effort information in a nice formatted way
export const EffortDisplay: React.FC<EffortDisplayProps> = ({
  clock,
  className,
}) => {
  const effortText = clock?.metrics?.[0]?.effort;
  if (!effortText) {
    return (
      <div className={cn("mx-auto flex items-center justify-center", className ?? "")}>
        <span className="text-2xl md:text-3xl text-gray-400">No exercise</span>
      </div>
    );
  }

  // Parse effort lines to extract components
  const effortLines = effortText.split('\n').filter(line => line.trim());
  
  return (
    <div className={cn("mx-auto flex flex-col items-start", className ?? "")}>
      {effortLines.map((line, index) => {
        // Parse each line to extract effort, reps, resistance, and distance
        // Expected format: "Exercise Name (10reps, 50kg, 100m)"
        const match = line.match(/^(.+?)\s*(\([^)]+\))?$/);
        
        if (!match) {
          return (
            <div key={index} className="mb-1">
              <span className="text-lg md:text-xl font-semibold text-gray-800">{line}</span>
            </div>
          );
        }

        const [, exerciseName, modifiersStr] = match;
        const modifiers = modifiersStr ? modifiersStr.slice(1, -1) : ''; // Remove parentheses
        
        return (
          <div key={index} className="mb-2 last:mb-0">
            {/* Exercise name */}
            <div className="text-xl md:text-2xl font-bold text-blue-700 mb-1">
              {exerciseName.trim()}
            </div>
            
            {/* Modifiers (reps, weight, distance) */}
            {modifiers && (
              <div className="flex flex-wrap gap-3 text-sm md:text-base">
                {modifiers.split(',').map((modifier, modIndex) => {
                  const trimmed = modifier.trim();
                  
                  // Style different types of modifiers
                  let bgColor = 'bg-gray-100';
                  let textColor = 'text-gray-700';
                  let icon = '';
                  
                  if (trimmed.includes('reps') || /^\d+$/.test(trimmed)) {
                    bgColor = 'bg-green-100';
                    textColor = 'text-green-800';
                    icon = '🔄';
                  } else if (trimmed.includes('kg') || trimmed.includes('lb') || trimmed.includes('lbs')) {
                    bgColor = 'bg-purple-100';
                    textColor = 'text-purple-800';
                    icon = '💪';
                  } else if (trimmed.includes('m') || trimmed.includes('km') || trimmed.includes('ft') || trimmed.includes('mi')) {
                    bgColor = 'bg-blue-100';
                    textColor = 'text-blue-800';
                    icon = '📏';
                  }
                  
                  return (
                    <span
                      key={modIndex}
                      className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        bgColor,
                        textColor
                      )}
                    >
                      {icon && <span className="mr-1">{icon}</span>}
                      {trimmed}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export interface EffortAnchorProps {
  clock: RuntimeSpan | undefined;
  className?: string;
}

// Component that displays effort information for a named span
export const EffortAnchor: React.FC<EffortAnchorProps> = ({
  clock,
  className,
}) => {
    
  // Extract effort text from the clock (effort comes from SET_SPAN events)

  return (
    <EffortDisplay
      clock={clock}
      className={className}
    />
  );
};
