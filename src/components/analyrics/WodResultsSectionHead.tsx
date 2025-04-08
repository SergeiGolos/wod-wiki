import React from 'react';

export interface EffortGroup {
  effort: string;
  count: number;
  totalReps: number;
  totalTime: string;
  totalWeightDistance: number; // Kept for backward compatibility
  totalWeight?: number;        // New field for weight
  totalDistance?: number;      // New field for distance
  unit: string;                // Kept for backward compatibility
  weightUnit?: string;         // New field for weight unit
  distanceUnit?: string;       // New field for distance unit
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
  // Handle weight/resistance independently
  const hasNewWeightMetric = group.totalWeight !== undefined;
  const weight = hasNewWeightMetric ? group.totalWeight : 
    (group.unit === 'lb' || group.unit === 'kg' ? group.totalWeightDistance : 0);
  const weightUnit = hasNewWeightMetric ? group.weightUnit : 
    (group.unit === 'lb' || group.unit === 'kg' ? group.unit : '');
  const hasWeight = weight !== undefined && weight > 0 && weightUnit;
  
  // Handle distance independently
  const hasNewDistanceMetric = group.totalDistance !== undefined;
  const distance = hasNewDistanceMetric ? group.totalDistance : 
    (group.unit === 'm' || group.unit === 'km' ? group.totalWeightDistance : 0);
  const distanceUnit = hasNewDistanceMetric ? group.distanceUnit : 
    (group.unit === 'm' || group.unit === 'km' ? group.unit : '');
  const hasDistance = distance !== undefined && distance > 0 && distanceUnit;
  
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
                        {weight}{weightUnit}
                      </span>
                    </div>
                  )}
                  
                  {/* Distance metric - only show if there's a distance value */}
                  {hasDistance && (
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">📏</span>
                      <span className="font-medium">
                        {distance}{distanceUnit}
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
