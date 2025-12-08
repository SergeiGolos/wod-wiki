import React from 'react';

interface BlockTestControlsProps {
  status: string;
  onStart: () => void;
  onPause?: () => void;
  onRestart: () => void;
  onNext: () => void;
}

export const BlockTestControls: React.FC<BlockTestControlsProps> = ({
  status,
  onStart,
  onPause,
  onRestart,
  onNext
}) => {
  const isIdle = status === 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  return (
    <div className="flex items-center space-x-4 p-4 bg-white border-b border-gray-200">
      {isIdle ? (
        <button
          onClick={onStart}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
        >
          ▶ Start
        </button>
      ) : isRunning ? (
        <>
          {onPause && (
            <button
              onClick={onPause}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-medium"
            >
              ⏸ Pause
            </button>
          )}
          <button
            onClick={onRestart}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
          >
            🔄 Restart
          </button>
        </>
      ) : isPaused ? (
        <>
          <button
            onClick={onStart}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
          >
            ▶ Resume
          </button>
          <button
            onClick={onRestart}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
          >
            🔄 Restart
          </button>
        </>
      ) : (
        <button
          onClick={onRestart}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
        >
          🔄 Restart
        </button>
      )}
      
      <button
        onClick={onNext}
        disabled={isRunning}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        title="Execute single step"
      >
        ⏭ Step
      </button>
      
      <div className="ml-auto text-sm text-gray-500">
        Status: <span className="font-semibold uppercase">{status}</span>
      </div>
    </div>
  );
};
