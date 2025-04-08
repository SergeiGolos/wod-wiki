import React from 'react';

export interface EffortGroup {
  effort: string;
  count: number;
  totalReps: number;
  totalTime: string;
  totalWeightDistance: number;
  unit: string;
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
  return (
    <div className="shadow-sm">
      <div className="flex items-stretch">
        {/* Main content area */}
        <div 
          className="flex-grow cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={onToggle}
        >
          <div className="flex justify-between items-center p-2">
            <div className="flex items-center space-x-3">
              <h3 className="font-semibold text-gray-800">
                {group.effort}
              </h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5">
                {group.count} {group.count === 1 ? 'round' : 'rounds'}
              </span>
              
              {/* Metrics in the same row */}
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">⏱️</span>
                  <span className="font-medium">{group.totalTime}s</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">🔄</span>
                  <span className="font-medium">{group.totalReps} reps</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">📏</span>
                  <span className="font-medium">
                    {group.totalWeightDistance > 0 ? `${group.totalWeightDistance}${group.unit}` : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
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
