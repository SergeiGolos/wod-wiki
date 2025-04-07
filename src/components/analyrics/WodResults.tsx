import React, { MutableRefObject, useState } from 'react';
import { ResultSpan, ITimerRuntime } from '@/core/timer.types';

interface WodResultsProps {
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;  
}

export const WodResults: React.FC<WodResultsProps> = ({ results, runtime }) => {
  // State to track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Extract all metrics from result spans
  const exerciseMetrics = results.flatMap(result => 
    result.metrics.map(metric => ({
      result,
      effort: metric.effort,
      repetitions: metric.repetitions,
      value: metric.value,
      unit: metric.unit,
      duration: result.duration ? result.duration() / 1000 : 0, // duration in seconds
      timestamp: result.stop?.timestamp || Date.now() // Use createdAt timestamp or current time as fallback
    }))
  );

  // Group metrics by effort type
  const groupedByEffort = exerciseMetrics.reduce((acc, item) => {
    if (!acc[item.effort]) {
      acc[item.effort] = [];
    }
    acc[item.effort].push(item);
    return acc;
  }, {} as Record<string, typeof exerciseMetrics>);

  // Calculate totals for each effort group and reverse the order of items
  const effortGroups = Object.entries(groupedByEffort).map(([effort, items]) => {
    // Reverse the order of items within each group
    const reversedItems = [...items].reverse();
    
    const totalReps = items.reduce((sum, m) => sum + m.repetitions, 0);
    const totalTime = items.reduce((sum, m) => sum + m.duration, 0).toFixed(1);
    
    // Calculate total weight/distance
    const totalWeightDistance = items.reduce((acc, item) => {
      if (item.value > 0) {
        return acc + (item.value * item.repetitions);
      }
      return acc;
    }, 0);
    
    // Get the unit from the first item with a value (if any)
    const unit = items.find(item => item.value > 0)?.unit || '';
    
    // Find the newest timestamp in this group
    const newestTimestamp = Math.max(...items.map(item => item.timestamp));
    
    return {
      effort,
      items: reversedItems, // Use the reversed items
      totalReps,
      totalTime,
      totalWeightDistance,
      unit,
      count: items.length,
      newestTimestamp // Store the newest timestamp for sorting
    };
  });

  // Sort effort groups by newest timestamp, so groups with newest events appear first
  const sortedEffortGroups = [...effortGroups].sort((a, b) => 
    b.newestTimestamp - a.newestTimestamp
  );

  // Toggle section expansion
  const toggleSection = (effort: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [effort]: !prev[effort]
    }));
  };

  // Check if a section is expanded
  const isSectionExpanded = (effort: string) => {
    // Default to collapsed (false) if not explicitly expanded
    return expandedSections[effort] === true;
  };

  return (
    <div className="px-3 py-1">
      {sortedEffortGroups.map((group, groupIndex) => (
        <div key={`group-${group.effort}`} className="mb-3">
          {/* Card-style summary group */}
          <div className="shadow-sm">
            <div className="flex items-stretch">
              {/* Main content area */}
              <div 
                className="flex-grow cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSection(group.effort)}
              >
                <div className="flex justify-between items-center p-3">
                  <h3 className="font-semibold text-gray-800">
                    {group.effort}
                  </h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5">
                    {group.count} {group.count === 1 ? 'round' : 'rounds'}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 px-3 pb-3 text-sm">
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
              
              {/* Toggle button on the right */}
              <div 
                className="flex items-center justify-center w-10 border-l border-gray-200 cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => toggleSection(group.effort)}
              >
                <div className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center leading-none">
                  <span className="text-gray-600 font-bold" style={{ lineHeight: '1', marginTop: '-1px' }}>
                    {isSectionExpanded(group.effort) ? '−' : '+'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Detailed table (only shown if section is expanded) */}
          {isSectionExpanded(group.effort) && (
            <div className="mt-1 overflow-x-auto border-t border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Round
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Reps
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Weight / Distance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.items.map((item, index) => {
                    const result = item.result;
                    const blockId = result.blockKey?.split('|')[0] || 'unknown';
                    
                    return (
                      <tr key={`${group.effort}-${index}`}
                          className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50`}>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {result.index || 'N/A'} (Block {blockId})
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {item.duration.toFixed(1)}s
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {item.repetitions > 0 ? `${item.repetitions}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {item.value > 0 ? `${item.value}${item.unit}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
