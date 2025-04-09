import React, { MutableRefObject, useState } from 'react';
import { ResultSpan, ITimerRuntime, MetricValue } from '@/core/timer.types';
import { WodResultsSectionHead, EffortGroup } from './WodResultsSectionHead';
import { WodResultsRow } from './WodResultsRow';

interface WodResultsProps {
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;  
}

interface ResultMetricItem {
  result: ResultSpan;
  effort: string;
  repetitions: number;
  resistance?: MetricValue;
  distance?: MetricValue;
  duration: number;
  timestamp: number;
}

export const WodResults: React.FC<WodResultsProps> = ({ results, runtime }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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

  const groupedByEffort = exerciseMetrics.reduce((acc, item) => {
    if (!acc[item.effort]) {
      acc[item.effort] = [];
    }
    acc[item.effort].push(item);
    return acc;
  }, {} as Record<string, ResultMetricItem[]>);

  // Calculate totals for each effort group and reverse the order of items
  const effortGroups = Object.entries(groupedByEffort).map(([effort, items]) => {
    const reversedItems = [...items].reverse();
    
    const totalReps = items.reduce((sum, m) => sum + (m.repetitions?.value ?? 0), 0);
    const totalTime = items.reduce((sum, m) => sum + m.duration, 0).toFixed(1);
    
    // Calculate the total weight (resistance)
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
    
    const newestTimestamp = Math.max(...items.map(item => item.timestamp));
    
    return {
      effort,
      items: reversedItems, 
      totalReps,
      totalTime,
      totalWeight: totalWeight > 0 ? totalWeight : undefined,
      totalDistance: totalDistance > 0 ? totalDistance : undefined,
      weightUnit: weightUnit || undefined,
      distanceUnit: distanceUnit || undefined,
      count: items.length,
      newestTimestamp 
    };
  });

  const sortedEffortGroups = [...effortGroups].sort((a, b) => 
    b.newestTimestamp - a.newestTimestamp
  );

  const toggleSection = (effort: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [effort]: !prev[effort]
    }));
  };

  const isSectionExpanded = (effort: string) => {
    return expandedSections[effort] === true;
  };

  // Convert to EffortGroup without any backward compatibility
  const toEffortGroup = (group: typeof effortGroups[0]): EffortGroup => ({
    effort: group.effort,
    count: group.count,
    totalReps: group.totalReps,
    totalTime: group.totalTime,
    totalWeight: group.totalWeight,
    totalDistance: group.totalDistance,
    weightUnit: group.weightUnit,
    distanceUnit: group.distanceUnit,
    newestTimestamp: group.newestTimestamp
  });

  return (
    <div className="">
      {sortedEffortGroups.map((group, groupIndex) => (
        <div key={`group-${group.effort}`} className="">
          <WodResultsSectionHead
            group={toEffortGroup(group)}
            isExpanded={isSectionExpanded(group.effort)}
            onToggle={() => toggleSection(group.effort)}
          />
          
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
