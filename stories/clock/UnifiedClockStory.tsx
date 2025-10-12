import React from 'react';
import { EnhancedTimerHarness, MemoryCard, TimerControls } from '../../src/clock/components/EnhancedTimerHarness';
import { DigitalClock } from '../../src/clock/components/DigitalClock';
import { TimeSpan } from '../../src/runtime/behaviors/TimerBehavior';

export interface UnifiedClockStoryConfig {
  timerType: 'countdown' | 'countup';
  durationMs: number;
  autoStart?: boolean;
  title: string;
  description: string;
  timeSpans?: TimeSpan[];
}

interface UnifiedClockStoryProps {
  config: UnifiedClockStoryConfig;
}

/**
 * UnifiedClockStory provides a consistent format for all clock stories
 *
 * This component creates a standardized layout with:
 * - Clock display
 * - Memory card with start/stop table and recalculate functionality
 * - Timer controls (start/stop/pause/resume/reset)
 * - Story metadata
 */
export const UnifiedClockStory: React.FC<UnifiedClockStoryProps> = ({ config }) => {
  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Story Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {config.title}
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          {config.description}
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
            {config.timerType === 'countdown' ? 'Countdown Timer' : 'Count Up Timer'}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">
            {config.autoStart ? 'Auto-start' : 'Manual start'}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">
            Duration: {formatDuration(config.durationMs)}
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clock Display - Left (Half Width) */}
        <div className="lg:col-span-1">
          <EnhancedTimerHarness
            timerType={config.timerType}
            durationMs={config.durationMs}
            autoStart={config.autoStart}
            timeSpans={config.timeSpans}
          >
            {({ blockKey }) => (
              <DigitalClock
                blockKey={blockKey}
                title={config.title}
                duration={config.timerType === 'countdown' ? config.durationMs : undefined}
                timerType={config.timerType}
                currentRound={1}
                metrics={[
                  { label: 'Rounds', value: '1', unit: 'of 5' },
                  { label: 'Reps', value: '25', unit: 'total' }
                ]}
                nextCardLabel="Rest Period - 2:00"
              />
            )}
          </EnhancedTimerHarness>
        </div>

        {/* Memory and Controls - Right (Half Width) */}
        <div className="lg:col-span-1 space-y-6">
          <EnhancedTimerHarness
            timerType={config.timerType}
            durationMs={config.durationMs}
            autoStart={config.autoStart}
            timeSpans={config.timeSpans}
          >
            {({ memoryRefs, controls, isRunning, recalculateElapsed, blockKey }) => (
              <>
                <MemoryCard
                  timeSpans={memoryRefs.timeSpans.get()}
                  isRunning={isRunning}
                  blockKey={blockKey}
                  onRecalculate={recalculateElapsed}
                  timerType={config.timerType}
                />

                <TimerControls
                  isRunning={isRunning}
                  onStart={controls.start}
                  onStop={controls.stop}
                  onPause={controls.pause}
                  onResume={controls.resume}
                  onReset={controls.reset}
                />
              </>
            )}
          </EnhancedTimerHarness>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Interactive Features</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Use the timer controls to start, stop, pause, resume, and reset the timer</li>
          <li>• Click "Recalculate Elapsed" to update the elapsed time display</li>
          <li>• The memory card shows all start/stop time spans in a table format</li>
          <li>• Clock display updates in real-time when the timer is running</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Helper function to format duration for display
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}