import React, { MutableRefObject } from 'react';
import { ResultSpan, ITimerRuntime } from '@/core/timer.types';

interface WodResultsProps {
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;  
}

export const WodResults: React.FC<WodResultsProps> = ({ results, runtime }) => {
  // Extract all metrics from result spans
  const exerciseMetrics = results.flatMap(result => 
    result.metrics.map(metric => ({
      result,
      effort: metric.effort,
      repetitions: metric.repetitions,
      value: metric.value,
      unit: metric.unit,
      duration: result.duration ? result.duration() / 1000 : 0 // duration in seconds
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

  // Calculate totals for each effort group
  const effortGroups = Object.entries(groupedByEffort).map(([effort, items]) => {
    const totalReps = items.reduce((sum, m) => sum + m.repetitions, 0);
    const totalTime = items.reduce((sum, m) => sum + m.duration, 0).toFixed(1);
    
    return {
      effort,
      items,
      totalReps,
      totalTime
    };
  });

  return (
    <div className="overflow-x-auto px-3 py-1">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Round
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Exercise
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Time
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Metrics
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {effortGroups.map((group, groupIndex) => [
            // Group header with totals
            <tr key={`group-${group.effort}`} className="bg-gray-100 font-semibold">
              <td className="px-3 py-2 text-sm text-gray-700">
                Total
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {group.effort}
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {group.totalTime}s
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {group.totalReps} reps
              </td>
            </tr>,
            // Individual instances
            ...group.items.map((item, index) => {
              const result = item.result;
              const blockId = result.blockKey?.split('|')[0] || 'unknown';
              
              return (
                <tr key={`${group.effort}-${index}`}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                    {result.index || 'N/A'} (Block {blockId})
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200">
                    {item.effort}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                    {item.duration.toFixed(1)}s
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">  
                    {item.repetitions > 0 && `${item.repetitions} reps`}
                    {item.value > 0 && ` ${item.value}${item.unit}`}
                  </td>
                </tr>
              );
            })
          ])}
        </tbody>
      </table>
    </div>
  );
};
