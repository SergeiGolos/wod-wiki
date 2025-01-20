import React from 'react';
import { RuntimeBlock } from '../../../lib/RuntimeBlock';
import { RuntimeResult } from '@/lib/RuntimeResult';
import { TimerEvent } from '@/lib/timer.runtime';

interface WodResultsProps {
  results: TimerEvent[];
}

export const WodResults: React.FC<WodResultsProps> = ({ results }) => {
  // Group results by blockId
  const groupedResults = results.reduce((acc, result) => {
    const blockId = result.blockId || 'unknown';
    if (!acc[blockId]) {
      acc[blockId] = [];
    }
    acc[blockId].push(result);
    return acc;
  }, {} as Record<string, TimerEvent[]>);

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
              Notes
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {Object.entries(groupedResults).map(([blockId, blockResults], blockIndex) => (
            <React.Fragment key={blockId}>
              {/* Section row */}
              <tr className="bg-gray-100">
                <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-gray-700">
                  Block {blockId}
                </td>
              </tr>
              {/* Result rows */}
              {blockResults.map((result, index) => (
                <tr key={`${blockId}-${index}`}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                      index < blockResults.length - 1 ? 'border-b border-gray-200' : ''
                    }`}>
                  <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                    {result.index}
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200">
                    {JSON.stringify(result.timestamp)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                    {result.type}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">                  
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
