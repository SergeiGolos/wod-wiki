import React from 'react';

interface BlockTestControlsProps {
  status: string;
  onStart: () => void;
  onRestart: () => void;
  onNext: () => void;
}

export const BlockTestControls: React.FC<BlockTestControlsProps> = ({
  status,
  onStart,
  onRestart,
  onNext
}) => {
  const isRunning = status === 'running' || status === 'paused';

  return (
    <div className="flex items-center space-x-4 p-4 bg-white border-b border-gray-200">
      {!isRunning ? (
        <button
          onClick={onStart}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
        >
          Start
        </button>
      ) : (
        <button
          onClick={onRestart}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
        >
          Restart
        </button>
      )}
      
      <button
        onClick={onNext}
        disabled={!isRunning && status !== 'idle'} 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
      
      <div className="ml-auto text-sm text-gray-500">
        Status: <span className="font-semibold uppercase">{status}</span>
      </div>
    </div>
  );
};
