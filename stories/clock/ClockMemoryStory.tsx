import React, { useState, useEffect } from 'react';
import { TimerTestHarness } from './utils/TimerTestHarness';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';
import { TimerMemoryVisualization } from '../../src/clock/TimerMemoryVisualization';
import { ClockMemoryStoryConfig } from './utils/ConfigValidation';

interface ClockMemoryStoryProps {
  config: ClockMemoryStoryConfig;
}

/**
 * ClockMemoryStory combines clock and memory visualization in a split-panel layout
 * with hover highlighting functionality.
 *
 * This component serves as a story wrapper that:
 * - Sets up timer runtime with predefined state
 * - Renders clock display on the left panel
 * - Renders memory visualization on the right panel
 * - Manages hover state for bidirectional highlighting
 * - Displays story metadata (title and description)
 * - Handles cleanup on unmount
 */
export const ClockMemoryStory: React.FC<ClockMemoryStoryProps> = ({ config }) => {
  const [hoveredSection, setHoveredSection] = useState<'clock' | 'memory' | null>(null);

  // Cleanup hover state on unmount
  useEffect(() => {
    return () => {
      setHoveredSection(null);
    };
  }, []);

  const handleClockHover = (highlighted: boolean) => {
    setHoveredSection(highlighted ? 'clock' : null);
  };

  const handleMemoryHover = (highlighted: boolean) => {
    setHoveredSection(highlighted ? 'memory' : null);
  };

  const isClockHighlighted = hoveredSection === 'memory';
  const isMemoryHighlighted = hoveredSection === 'clock';

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Story Metadata */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {config.title}
        </h2>
        <p className="text-gray-600 leading-relaxed">
          {config.description}
        </p>
      </div>

      {/* Split Panels */}
      <div className="flex gap-6">
        {/* Clock Panel - Left */}
        <div
          className={`flex-1 p-6 border-2 rounded-lg transition-colors duration-150 ${
            isClockHighlighted
              ? 'bg-blue-100 border-blue-300'
              : 'bg-white border-gray-200'
          }`}
          onMouseEnter={() => handleClockHover(true)}
          onMouseLeave={() => handleClockHover(false)}
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Clock Display
            </h3>
            <div className="text-sm text-gray-500">
              Timer visualization showing elapsed time
            </div>
          </div>

          <div className="flex justify-center items-center min-h-[120px]">
            <TimerTestHarness
              durationMs={config.durationMs}
              isRunning={config.isRunning}
              timeSpans={config.timeSpans}
            >
              {({ blockKey }) => (
                <ClockAnchor blockKey={blockKey} />
              )}
            </TimerTestHarness>
          </div>
        </div>

        {/* Memory Panel - Right */}
        <div
          className={`flex-1 p-6 border-2 rounded-lg transition-colors duration-150 ${
            isMemoryHighlighted
              ? 'bg-blue-100 border-blue-300'
              : 'bg-white border-gray-200'
          }`}
          onMouseEnter={() => handleMemoryHover(true)}
          onMouseLeave={() => handleMemoryHover(false)}
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Memory Display
            </h3>
            <div className="text-sm text-gray-500">
              Timer memory allocations and state
            </div>
          </div>

          <TimerTestHarness
            durationMs={config.durationMs}
            isRunning={config.isRunning}
            timeSpans={config.timeSpans}
          >
            {({ blockKey, memoryRefs }) => (
              <TimerMemoryVisualization
                timeSpansRef={memoryRefs.timeSpans}
                isRunningRef={memoryRefs.isRunning}
                blockKey={blockKey}
                onMemoryHover={handleMemoryHover}
                isHighlighted={isMemoryHighlighted}
              />
            )}
          </TimerTestHarness>
        </div>
      </div>

      {/* Hover State Indicator */}
      <div className="mt-6 text-center">
        <div className="text-sm text-gray-500">
          Hover over either panel to highlight the connection between clock and memory
        </div>
        {hoveredSection && (
          <div className="mt-2 text-sm font-medium text-blue-600">
            {hoveredSection === 'clock' ? 'Clock' : 'Memory'} panel highlighted
          </div>
        )}
      </div>
    </div>
  );
};