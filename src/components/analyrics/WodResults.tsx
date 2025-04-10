import React, { MutableRefObject, useState } from 'react';
import { ResultSpan, ITimerRuntime, MetricValue, RuntimeMetric } from '@/core/timer.types';
import { WodResultsSectionHead, EffortGroup } from './WodResultsSectionHead';
import { WodResultsRow } from './WodResultsRow';

interface WodResultsProps {
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;  
}

export interface ResultMetricItem extends RuntimeMetric { 
  result: ResultSpan; 
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
      duration: result.duration ? result.duration() / 1000 : 0, 
      timestamp: result.stop?.timestamp || result.start?.timestamp || Date.now() 
    }))
  );

  const groupedByEffort = exerciseMetrics.reduce((acc, item) => {
    if (!acc[item.effort]) {
      acc[item.effort] = [];
    }
    acc[item.effort].push(item);
    return acc;
  }, {} as Record<string, ResultMetricItem[]>);

  const effortGroups = Object.entries(groupedByEffort).map(([effort, items]) => {
    const reversedItems = [...items].reverse();
    
    const totalReps = items.reduce((sum, m) => sum + (m.repetitions?.value ?? 0), 0);
    const totalTime = items.reduce((sum, m) => sum + m.duration, 0).toFixed(1);
    
    const totalWeight = items.reduce((acc, item) => {
      if (item.resistance && item.resistance.value > 0) {
        const reps = item.repetitions?.value ?? 1;
        return acc + (item.resistance.value * (reps > 0 ? reps : 1));
      }      
      return acc;
    }, 0);
    
    const totalDistance = items.reduce((acc, item) => {
      if (item.distance && item.distance.value > 0) {
        const reps = item.repetitions?.value ?? 1;
        return acc + (item.distance.value * (reps > 0 ? reps : 1));
      }
      return acc;
    }, 0);
    
    const weightUnit = items.find(item => item.resistance)?.resistance?.unit || '';
    
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
      <div className="flex bg-gray-100 p-2 border-b border-gray-300 font-semibold text-sm text-gray-700 sticky top-0 z-10"> 
        <div className="w-1/3 px-2">Effort</div>
        <div className="w-1/6 px-2 text-right">Duration</div>
        <div className="w-1/12 px-2 text-right">Reps</div>
        <div className="w-1/6 px-2 text-right">Resistance</div>
        <div className="w-1/6 px-2 text-right">Distance</div>
        <div className="w-1/12 px-2 text-right">Time</div>
      </div>

      {sortedEffortGroups.map((group, groupIndex) => (
        <div key={`group-${group.effort}`} className="border-b border-gray-200">
          <WodResultsSectionHead
            group={toEffortGroup(group)}
            isExpanded={isSectionExpanded(group.effort)}
            onToggle={() => toggleSection(group.effort)}
          />
          
          {isSectionExpanded(group.effort) && (
            <div className="overflow-x-auto bg-gray-50/50"> 
              <table className="min-w-full divide-y divide-gray-200">
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
