/**
 * WodBlockHeader - Header component for WOD blocks showing label and action buttons
 */

import React from 'react';

export interface WodBlockHeaderProps {
  /** Optional custom label for the workout */
  label?: string;
  
  /** Index of the workout (1-based for display) */
  index: number;
  
  /** Callback when Record button is clicked */
  onRecord?: () => void;
  
  /** Callback when Track button is clicked */
  onTrack?: () => void;
  
  /** Whether the block is currently active (cursor inside) */
  isActive?: boolean;
}

/**
 * Header component displayed above WOD blocks
 */
export const WodBlockHeader: React.FC<WodBlockHeaderProps> = ({
  label,
  index,
  onRecord,
  onTrack,
  isActive = false
}) => {
  const title = label || `Workout ${index}`;
  
  return (
    <div 
      className={`wod-block-header flex items-center justify-between px-3 py-2 border-b ${
        isActive 
          ? 'bg-blue-50 border-blue-300' 
          : 'bg-gray-50 border-gray-300'
      }`}
      style={{
        fontSize: '13px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div className="font-semibold text-gray-700">
        {title}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRecord}
          className="px-2 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors"
          title="Record workout results"
        >
          Record
        </button>
        <button
          onClick={onTrack}
          className="px-2 py-1 text-xs font-medium text-green-600 bg-white border border-green-300 rounded hover:bg-green-50 transition-colors"
          title="Track workout progress"
        >
          Track
        </button>
      </div>
    </div>
  );
};
