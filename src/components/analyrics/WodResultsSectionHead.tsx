import React from 'react';

export interface EffortGroup {
  effort: string;
  count: number;
  totalReps: number;
  totalTime: string;
  totalWeight?: number;
  totalDistance?: number;
  weightUnit?: string;
  distanceUnit?: string;
  newestTimestamp: number;
}

interface WodResultsSectionHeadProps {
  group: EffortGroup;
  isExpanded: boolean;
  onToggle: () => void;
}

export const WodResultsSectionHead: React.FC<WodResultsSectionHeadProps> = ({ 
  group, 
  isExpanded, 
  onToggle 
}) => {
  // Handle weight/resistance directly
  const hasWeight = group.totalWeight !== undefined && group.totalWeight > 0 && group.weightUnit;
  
  // Handle distance directly
  const hasDistance = group.totalDistance !== undefined && group.totalDistance > 0 && group.distanceUnit;
  
  return (
    <div className="shadow-sm">
      <div className="flex items-stretch">
        {/* Main content area */}
        <div 
          className="flex-grow cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={onToggle}
        >
          <div className="flex justify-between items-center p-2">
            <div className="flex items-center">
              <h3 className="font-semibold text-gray-800 w-32 mr-2">
                {group.effort}
              </h3>
              
              {/* Metrics in the same row with equal spacing */}
              <div className="flex items-center">
                {/* Use a grid layout for even spacing */}
                <div className="grid grid-cols-4 gap-4">
                  {/* Time metric */}
                  {group.totalTime && group.totalTime !== '0' && (
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">⏱️</span>
                      <span className="font-medium">{group.totalTime}s</span>
                    </div>
                  )}
                  
                  {/* Reps metric */}
                  {group.totalReps > 0 && (
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">🔄</span>
                      <span className="font-medium">{group.totalReps} reps</span>
                    </div>
                  )}
                  
                  {/* Weight metric - only show if there's a weight value */}
                  {hasWeight && (
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">💪</span>
                      <span className="font-medium">
                        {group.totalWeight}{group.weightUnit}
                      </span>
                    </div>
                  )}
                  
                  {/* Distance metric - only show if there's a distance value */}
                  {hasDistance && (
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">📏</span>
                      <span className="font-medium">
                        {group.totalDistance}{group.distanceUnit}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Rounds counter moved to right */}
        <div
          className="flex items-center px-3 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={onToggle}
        >
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap">
            {group.count} {group.count === 1 ? 'round' : 'rounds'}
          </span>
        </div>
        
        {/* Toggle button on the right */}
        <div 
          className="flex h-10 items-center justify-center w-12 px-2 border-l border-gray-200 cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors h-full"
          onClick={onToggle}
        >
          <div className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center leading-none ">
            <span className="text-gray-600 font-bold" style={{ lineHeight: '1', marginTop: '-1px' }}>
              {isExpanded ? '−' : '+'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
