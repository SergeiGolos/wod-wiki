
import React from 'react';
import { IRuntimeBlock } from '../core/runtime/timer.runtime';

interface WodTableProps {
  runtime: IRuntimeBlock[];
}

export const WodTable: React.FC<WodTableProps> = ({ runtime }) => {
  // Extract the main workout parameters  
  return (
    <div className="overflow-x-auto px-3 py-1">
      <div className='text-lg font-semibold text-gray-700 mb-3'>
      Training Metrics
      </div>
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Rounds
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
          {runtime?.map((exercise, index) => {
            const fragments = exercise.metrics
            return (
              <tr key={exercise.stack[0]?.id || index} 
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                    index < runtime.length - 1 ? 'border-b border-gray-200' : ''
                  }`}>
                <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                  {exercise.currentRound}
                </td>
                <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200">
                  {exercise.label}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500">
                  {exercise.metrics?.map(r=> (<div>{r.value} {r.name}</div>))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
