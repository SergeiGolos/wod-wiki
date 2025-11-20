import React from 'react';
import { useMemorySubscription } from '../runtime/hooks/useMemorySubscription';
import { TypedMemoryReference } from '../runtime/IMemoryReference';
import { TimeSpan } from '../runtime/behaviors/TimerBehavior';

interface TimerMemoryVisualizationProps {
  timeSpansRef: TypedMemoryReference<TimeSpan[]>;
  isRunningRef: TypedMemoryReference<boolean>;
  blockKey: string;
  onMemoryHover?: (highlighted: boolean) => void;
  isHighlighted?: boolean;
}

/**
 * Formats a Date object to HH:MM:SS format.
 */
const formatTimestamp = (date?: Date): string => {
  if (!date) return 'running';

  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * TimerMemoryVisualization displays timer memory allocations in a structured format.
 *
 * This component subscribes to timer memory references and displays:
 * - Time spans array with start/stop timestamps
 * - Running state with visual indicator
 * - Block key identifier
 * - Error states for missing memory
 */
export const TimerMemoryVisualization: React.FC<TimerMemoryVisualizationProps> = ({
  timeSpansRef,
  isRunningRef,
  blockKey,
  onMemoryHover,
  isHighlighted = false
}) => {
  // Subscribe to memory references
  const timeSpans = useMemorySubscription(timeSpansRef);
  const isRunning = useMemorySubscription(isRunningRef);

  // Handle hover events
  const handleMouseEnter = () => {
    onMemoryHover?.(true);
  };

  const handleMouseLeave = () => {
    onMemoryHover?.(false);
  };

  // Handle missing memory state
  if (!timeSpans || isRunning === undefined) {
    return (
      <div
        className={`p-4 border border-gray-200 rounded-lg ${
          isHighlighted ? 'bg-blue-100' : 'bg-gray-50'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="text-gray-500 italic">No memory allocated</div>
      </div>
    );
  }

  // Handle error state for invalid memory
  if (!Array.isArray(timeSpans)) {
    return (
      <div
        className={`p-4 border border-red-200 rounded-lg bg-red-50`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="text-red-600">Memory format error</div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 border border-gray-200 rounded-lg transition-colors duration-150 ${
        isHighlighted ? 'bg-blue-100 border-blue-300' : 'bg-white'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Block Key */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-600 mb-1">Block Key</div>
        <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {blockKey}
        </div>
      </div>

      {/* Running State */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-600 mb-1">Running State</div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isRunning ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          <span className="text-sm font-medium">
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Time Spans Array */}
      <div>
        <div className="text-sm font-semibold text-gray-600 mb-2">
          Time Spans ({timeSpans.length})
        </div>
        {timeSpans.length === 0 ? (
          <div className="text-gray-500 italic text-sm">No time spans recorded</div>
        ) : (
          <div className="space-y-2">
            {timeSpans.map((span, index) => (
              <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                <div className="font-medium text-gray-700 mb-1">
                  Span {index + 1}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Start: </span>
                    <span className="font-mono">
                      {formatTimestamp(span.start)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Stop: </span>
                    <span className="font-mono">
                      {formatTimestamp(span.stop)}
                    </span>
                  </div>
                </div>
                {/* Calculate duration for this span */}
                {span.start && (
                  <div className="mt-1 text-xs text-gray-600">
                    Duration: {span.stop
                      ? Math.round((span.stop.getTime() - span.start.getTime()) / 1000)
                      : Math.round((Date.now() - span.start.getTime()) / 1000)
                    }s
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
