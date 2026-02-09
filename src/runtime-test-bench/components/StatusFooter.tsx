import React from 'react';
import { formatTimeMMSS } from '../../lib/formatTime';
import { StatusFooterProps } from '../types/interfaces';

/**
 * StatusFooter - Status bar component for runtime test bench
 * Displays execution status, cursor position, block count, and elapsed time
 */
export const StatusFooter: React.FC<StatusFooterProps> = ({
  status,
  statusMessage,
  lineNumber,
  columnNumber,
  blockCount,
  elapsedTime,
  onStatusClick,
  className = '',
  ...baseProps
}) => {
  const getStatusColor = (status: StatusFooterProps['status']) => {
    switch (status) {
      case 'executing': return 'text-green-400 bg-green-900/20';
      case 'paused': return 'text-yellow-400 bg-yellow-900/20';
      case 'completed': return 'text-blue-400 bg-blue-900/20';
      case 'error': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusText = (status: StatusFooterProps['status']) => {
    switch (status) {
      case 'executing': return 'Running';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'error': return 'Error';
      default: return 'Idle';
    }
  };

  const formatElapsedTime = (ms?: number) => formatTimeMMSS(ms || 0);

  const formatCursor = (line?: number, column?: number) => {
    if (line === undefined || column === undefined) return '--:--';
    return `${line + 1}:${column + 1}`;
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 bg-muted border-t border-border text-sm ${className}`}
      {...baseProps}
    >
      {/* Left side - Status */}
      <div className="flex items-center space-x-4">
        <div
          className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${getStatusColor(status)} ${
            onStatusClick ? 'hover:bg-opacity-30' : ''
          }`}
          onClick={onStatusClick}
          title={statusMessage || getStatusText(status)}
        >
          {getStatusText(status)}
        </div>

        {statusMessage && statusMessage !== getStatusText(status) && (
          <span className="text-muted-foreground truncate max-w-xs" title={statusMessage}>
            {statusMessage}
          </span>
        )}
      </div>

      {/* Right side - Metadata */}
      <div className="flex items-center space-x-6 text-muted-foreground">
        {/* Cursor Position */}
        <div className="flex items-center space-x-1">
          <span className="text-muted-foreground/70">Ln</span>
          <span className="font-mono">{formatCursor(lineNumber, columnNumber)}</span>
        </div>

        {/* Block Count */}
        {blockCount !== undefined && (
          <div className="flex items-center space-x-1">
            <span className="text-muted-foreground/70">Blocks</span>
            <span className="font-mono">{blockCount}</span>
          </div>
        )}

        {/* Elapsed Time */}
        <div className="flex items-center space-x-1">
          <span className="text-muted-foreground/70">Time</span>
          <span className="font-mono">{formatElapsedTime(elapsedTime)}</span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'executing' ? 'bg-green-400 animate-pulse' :
              status === 'paused' ? 'bg-yellow-400' :
              status === 'completed' ? 'bg-blue-400' :
              status === 'error' ? 'bg-red-400' :
              'bg-muted'
            }`}
          />
          <span className="text-xs uppercase tracking-wide">
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};
