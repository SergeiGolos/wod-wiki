import React, { useMemo } from 'react';
import { useTimerElapsed } from '../../runtime/hooks/useTimerElapsed';

interface ClockAnchorProps {
  blockKey: string;
  title?: string;
  description?: string;
  duration?: number; // in milliseconds for countdown
  showProgress?: boolean;
}

export const ClockAnchor: React.FC<ClockAnchorProps> = ({
  blockKey,
  title = "AMRAP 20",
  description = "As Many Rounds As Possible",
  duration,
  showProgress = true
}) => {
  const { elapsed } = useTimerElapsed(blockKey);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(Math.abs(ms) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderPlaceholder = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>
        <div className="flex justify-center mb-8">
          <div className="text-7xl font-bold text-gray-900 tabular-nums">
            --:--
          </div>
        </div>
        {showProgress && duration && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>0%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: '0%' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // For countdown timers, show remaining time
  const displayTime = duration ? Math.max(0, duration - elapsed) : elapsed;
  const progress = duration ? Math.min((elapsed / duration) * 100, 100) : 0;

  if (elapsed === 0 && !duration) {
    return renderPlaceholder();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>

        {/* Time Display */}
        <div className="flex justify-center mb-8">
          <div className="text-7xl font-bold text-gray-900 tabular-nums">
            {formatTime(displayTime)}
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && duration > 0 && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
