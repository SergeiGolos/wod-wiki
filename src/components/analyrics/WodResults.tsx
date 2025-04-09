import React, { MutableRefObject, useState } from 'react';
import { ResultSpan, ITimerRuntime } from '@/core/timer.types';
import { WodResultsSectionHead, EffortGroup } from './WodResultsSectionHead';
import { WodResultsRow } from './WodResultsRow';

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
      resistance: metric.resistance,
      distance: metric.distance,
      duration: result.duration ? result.duration() / 1000 : 0, // duration in seconds
      timestamp: result.stop?.timestamp || result.start?.timestamp || Date.now() // Use stop, start, or current timestamp
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
    
    const totalReps = items.reduce((sum, m) => sum + (m.repetitions?.value ?? 0), 0);
    const totalTime = items.reduce((sum, m) => sum + m.duration, 0).toFixed(1);
    
    // Calculate total weight/resistance (only for weight units)
    const totalWeight = items.reduce((acc, item) => {
      if (item.resistance && item.resistance.value > 0) {
        const reps = item.repetitions?.value ?? 1;
        return acc + (item.resistance.value * (reps > 0 ? reps : 1));
      }      
      return acc;
    }, 0);
    
    // Calculate total distance (only for distance units)
    const totalDistance = items.reduce((acc, item) => {
      if (item.distance && item.distance.value > 0) {
        const reps = item.repetitions?.value ?? 1;
        return acc + (item.distance.value * (reps > 0 ? reps : 1));
      }
      return acc;
    }, 0);
    
    // Get the weight unit if any weight items exist
    const weightUnit = items.find(item => item.resistance)?.resistance?.unit || '';
    
    // Get the distance unit if any distance items exist
    const distanceUnit = items.find(item => item.distance)?.distance?.unit || '';
    
    // Find the newest timestamp in this group
    const newestTimestamp = Math.max(...items.map(item => item.timestamp));
    
    return {
      effort,
      items: reversedItems, // Use the reversed items
      totalReps,
      totalTime,
      totalWeight,
      totalDistance,
      weightUnit,
      distanceUnit,
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

  // Convert our internal effort group to the one needed by WodResultsSectionHead
  const toEffortGroup = (group: typeof effortGroups[0]): EffortGroup => ({
    effort: group.effort,
    count: group.count,
    totalReps: group.totalReps,
    totalTime: group.totalTime,
    totalWeightDistance: group.totalWeight, // For backward compatibility
    totalWeight: group.totalWeight,
    totalDistance: group.totalDistance,
    unit: group.weightUnit, // For backward compatibility
    weightUnit: group.weightUnit,
    distanceUnit: group.distanceUnit,
    newestTimestamp: group.newestTimestamp
  });

  return (
    <div className="">
      {sortedEffortGroups.map((group, groupIndex) => (
        <div key={`group-${group.effort}`} className="">
          {/* Use the section head component */}
          <WodResultsSectionHead
            group={toEffortGroup(group)}
            isExpanded={isSectionExpanded(group.effort)}
            onToggle={() => toggleSection(group.effort)}
          />
          
          {/* Detailed table (only shown if section is expanded) */}
          {isSectionExpanded(group.effort) && (
            <div className="overflow-x-auto border-t border-gray-200 shadow-sm">
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
                      Resistance
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Distance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.items.map((item, index) => (
                    <WodResultsRow 
                      key={`${group.effort}-${index}`}
                      item={item}
                      index={index}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
