import React from 'react';
import { ResultSpan } from '@/core/timer.types';

interface WodTableProps {
  results: ResultSpan[];
}

export const WodTable: React.FC<WodTableProps> = ({ results }) => {
  // Extract unique exercises and their metrics
  const exerciseMetrics = results.flatMap(result => 
    result.metrics.map(metric => ({
      blockKey: result.blockKey,
      index: result.index,
      round: result.stack?.[0] || 0,
      effort: metric.effort,
      repetitions: metric.repetitions,
      value: metric.value,
      unit: metric.unit
    }))
  );

  return (
    <div className="overflow-x-auto px-3 py-1">
      <div className='text-lg font-semibold text-gray-700 mb-3'>
      Training Metrics
      </div>
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
              Reps
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Weight
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {exerciseMetrics.map((metric, index) => (
            <tr key={`${metric.blockKey}-${index}`} 
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                  index < exerciseMetrics.length - 1 ? 'border-b border-gray-200' : ''
                }`}>
              <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                {metric.round}
              </td>
              <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200">
                {metric.effort}
              </td>
              <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                {metric.repetitions > 0 ? metric.repetitions : '-'}
              </td>
              <td className="px-3 py-2 text-sm text-gray-500">
                {metric.value > 0 ? `${metric.value}${metric.unit}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
