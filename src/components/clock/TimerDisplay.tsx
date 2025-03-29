import React from 'react';
import { TimerDisplay as TimerDisplayType } from '../core/timer.types';


interface TimerDisplayProps {
  display: TimerDisplayType;
}

/**
 * Format milliseconds to a readable time format
 */
function formatTime(ms: number): string {
  // Ensure ms is a valid number
  if (isNaN(ms) || ms < 0) {
    console.warn(`Invalid time value: ${ms}`);
    ms = 0;
  }

  // Convert milliseconds to seconds and minutes
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  // Format as MM:SS
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * TimerDisplay component for rendering the current state of the timer
 */
export const TimerDisplay: React.FC<TimerDisplayProps> = ({ display }) => {
  const { elapsed, remaining, state, label, round, totalRounds } = display;
  
  return (
    <div className="timer-display">
      <div className="timer-state" data-state={state}>
        <span className="timer-state-indicator"></span>
        {state.charAt(0).toUpperCase() + state.slice(1)}
      </div>
      
      <div className="timer-time">
        {formatTime(elapsed)}
      </div>
      
      {remaining !== undefined && (
        <div className="timer-remaining">
          {formatTime(remaining)}
        </div>
      )}
      
      {label && (
        <div className="timer-label">
          {label}
        </div>
      )}
      
      {round !== undefined && totalRounds !== undefined && (
        <div className="timer-round">
          Round {round + 1}/{totalRounds}
        </div>
      )}
      
      <style>{`
        .timer-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem;
          border-radius: 0.5rem;
          background-color: #f8f9fa;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .timer-state {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #6c757d;
        }
        
        .timer-state-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 0.5rem;
        }
        
        .timer-state[data-state="idle"] .timer-state-indicator {
          background-color: #6c757d;
        }
        
        .timer-state[data-state="running"] .timer-state-indicator {
          background-color: #28a745;
        }
        
        .timer-state[data-state="paused"] .timer-state-indicator {
          background-color: #ffc107;
        }
        
        .timer-state[data-state="complete"] .timer-state-indicator {
          background-color: #007bff;
        }
        
        .timer-time {
          font-size: 3rem;
          font-weight: 700;
          font-family: monospace;
          margin-bottom: 0.5rem;
        }
        
        .timer-remaining {
          font-size: 1.5rem;
          font-weight: 500;
          color: #6c757d;
          margin-bottom: 0.5rem;
        }
        
        .timer-label {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .timer-round {
          font-size: 1rem;
          color: #6c757d;
        }
      `}</style>
    </div>
  );
};

export default TimerDisplay;
