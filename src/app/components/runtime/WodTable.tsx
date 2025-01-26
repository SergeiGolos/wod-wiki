import React from 'react';
import { TimerRuntime } from '../../../lib/timer.runtime';

interface WodTableProps {
  runtime: TimerRuntime;
}

export const WodTable: React.FC<WodTableProps> = ({ runtime }) => {
  // Extract the main workout parameters
  const blocks = runtime.blocks;  
  const exercises = blocks.filter(x => x.block.children.length == 0); // Skip the first block which contains round info
  console.log("filter", blocks);
  return (
    <div className="overflow-x-auto px-3 py-1">
      <div className='text-lg font-semibold text-gray-700 mb-3'>
        Summary
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
          {exercises.map((exercise, index) => {
            const fragments = exercise.block.fragments;
            const reps = fragments.find(f => f.type === 'rep')?.reps || '';
            const effort = fragments.find(f => f.type === 'effort')?.effort || '';
            const resistance = fragments.find(f => f.type === 'resistance');
            const weight = resistance ? `${resistance.value}${resistance.units}` : '';
            
            return (
              <tr key={exercise.id} 
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                    index < exercises.length - 1 ? 'border-b border-gray-200' : ''
                  }`}>
                <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                  {exercise.lap}
                </td>
                <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200">
                  {effort}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                  {reps}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500">
                  {weight}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
