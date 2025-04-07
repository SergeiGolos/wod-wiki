import React, { MutableRefObject } from 'react';
import { ResultSpan, ITimerRuntime } from '@/core/timer.types';

interface WodResultsProps {
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;  
}

export const WodResults: React.FC<WodResultsProps> = ({ results, runtime }) => {
  // Group results by blockKey
  const groupedResults = results.reduce((acc, result) => {
    const blockKey = result.blockKey || 'unknown';
    if (!acc[blockKey]) {
      acc[blockKey] = [];
    }
    acc[blockKey].push(result);
    return acc;
  }, {} as Record<string, ResultSpan[]>);

  const groupedResultsArray = Object.entries(groupedResults);

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
          {groupedResultsArray.map(([blockKey, group], groupIndex) => {
            const blockId = blockKey.split('|')[0];
            
            return [
              <tr key={`${blockKey}-header`} className="bg-gray-100">
                <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-gray-700">
                  Block {blockId}
                </td>
              </tr>,              
              ...group.map((result, index) => {
                const duration = result.duration ? `${(result.duration() / 1000).toFixed(1)}s` : 'N/A';
                
                return (
                  <tr key={`${blockKey}-${index}`}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                        index < group.length - 1 ? 'border-b border-gray-200' : ''
                      }`}>
                    <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                      {result.index || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {result.metrics.map(metric => metric.effort).join(', ') || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                      {duration}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">  
                      {result.metrics.map((metric, i) => (
                        <div key={i}>
                          {metric.repetitions > 0 && `${metric.repetitions} reps`}
                          {metric.value > 0 && ` ${metric.value}${metric.unit}`}
                        </div>
                      ))}
                    </td>
                  </tr>
                );
              })
            ];
          })}
        </tbody>
      </table>
    </div>
  );
};
