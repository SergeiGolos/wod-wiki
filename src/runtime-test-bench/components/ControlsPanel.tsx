import React from 'react';
import { ControlsPanelProps } from '../types/interfaces';
import { panelBase, panelHeader, panelHeaderTitle, panelContent, buttonSecondary, buttonSuccess, buttonError } from '../styles/tailwind-components';

/**
 * ControlsPanel - Execution control panel for runtime test bench
 * Provides play/pause/stop/reset controls and step execution
 */
export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  status,
  enabled,
  onPlayPause,
  onStop,
  onReset,
  onStep,
  stepMode,
  onStepModeToggle,
  className = '',
  ...baseProps
}) => {
  const getStatusColor = (status: ControlsPanelProps['status']) => {
    switch (status) {
      case 'executing': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'completed': return 'text-blue-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: ControlsPanelProps['status']) => {
    switch (status) {
      case 'executing': return 'Running';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'error': return 'Error';
      default: return 'Idle';
    }
  };

  const isPlaying = status === 'executing';
  const canPlay = status === 'idle' || status === 'paused' || status === 'completed';
  const canPause = status === 'executing';
  const canStop = status === 'executing' || status === 'paused';
  const canReset = status !== 'idle';
  const canStep = status === 'idle' || status === 'paused' || status === 'completed';

  return (
    <div className={`${panelBase} ${className}`} {...baseProps}>
      <div className={panelHeader}>
        <h3 className={panelHeaderTitle}>Execution Controls</h3>
        <div className={`text-sm font-medium ${getStatusColor(status)}`}>
          {getStatusText(status)}
        </div>
      </div>

      <div className={`${panelContent} space-y-4`}>
        {/* Main Control Buttons */}
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={onPlayPause}
            disabled={!enabled || (!canPlay && !canPause)}
            className={`${buttonSuccess} transition-colors ${
              isPlaying
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
            title={isPlaying ? 'Pause execution' : 'Start execution'}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>

          <button
            onClick={onStop}
            disabled={!enabled || !canStop}
            className={buttonError}
            title="Stop execution"
          >
            ⏹️ Stop
          </button>

          <button
            onClick={onReset}
            disabled={!enabled || !canReset}
            className={buttonSecondary}
            title="Reset execution"
          >
            🔄 Reset
          </button>
        </div>

        {/* Step Controls */}
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={onStepModeToggle}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              stepMode
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title="Toggle step-by-step execution"
          >
            Step Mode
          </button>

          <button
            onClick={onStep}
            disabled={!enabled || !canStep || !stepMode}
            className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Execute next step"
          >
            Step ▶️
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${status === 'executing' ? 'bg-green-400 animate-pulse' : 'bg-muted'}`} />
            <span className="text-muted-foreground">Running</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${status === 'paused' ? 'bg-yellow-400' : 'bg-muted'}`} />
            <span className="text-muted-foreground">Paused</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${status === 'completed' ? 'bg-blue-400' : 'bg-muted'}`} />
            <span className="text-muted-foreground">Done</span>
          </div>
        </div>
      </div>
    </div>
  );
};