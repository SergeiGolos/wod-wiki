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
}) => {  // Check if there are any metrics to display
  if (!clock?.metrics || clock.metrics.length === 0) {
    return (
      <div className={cn("mx-auto flex items-center justify-center", className ?? "")}>
        <span className="text-2xl md:text-3xl text-gray-400">No exercise</span>
      </div>
    );
  }
    return (
    <div className={cn("mx-auto flex flex-col items-start space-y-3", className ?? "")}>
      {clock.metrics.map((metric, metricIndex) => {
        const effortText = metric.effort || `Exercise ${metricIndex + 1}`;
        
        // Extract values by type
        const reps = metric.values?.find(v => v.type === 'repetitions');
        const resistance = metric.values?.find(v => v.type === 'resistance');
        const distance = metric.values?.find(v => v.type === 'distance');
        
        return (
          <div key={`${metric.sourceId}-${metricIndex}`} className="w-full">
            <div className="flex flex-wrap items-center gap-2 text-lg md:text-xl">
              {/* Repetitions with icon and styling */}
              {reps && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                  <span className="mr-1">🔄</span>
                  {reps.value}
                </span>
              )}
              
              {/* Effort text */}
              <span className="font-semibold text-gray-800">
                {effortText}
              </span>
              
              {/* Resistance with icon and styling */}
              {resistance && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-800">
                  <span className="mr-1">💪</span>
                  {resistance.value}{resistance.unit || ''}
                </span>
              )}
              
              {/* Distance with icon and styling */}
              {distance && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                  <span className="mr-1">📏</span>
                  {distance.value}{distance.unit || ''}
                </span>
              )}
            </div>
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
