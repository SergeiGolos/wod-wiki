import React, { MutableRefObject } from 'react';
import { WodResultBlock } from '../core/timer.types';
import { TimerRuntime } from '../core/runtime/timer.runtime';


interface WodResultsProps {
  results: WodResultBlock[];
  runtime: MutableRefObject<TimerRuntime | undefined>;  
}

export const WodResults: React.FC<WodResultsProps> = ({ results, runtime }) => {
  // Group results by blockId
  let groupedResults : any[] = [];
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
          {groupedResults?.map(([groupId, group], groupIndex) => {
            const blockId = (groupId.split('|')[0] as any as number) * 1;
            const block = runtime.current?.[blockId];
            
            return [
              <tr key={`${groupId}-header`} className="bg-gray-100">
                <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-gray-700">
                  Block {JSON.stringify(block)}
                </td>
              </tr>,              
              ...group.map((result, index) => (
                <tr key={`${groupId}-${index}`}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                      index < group.length - 1 ? 'border-b border-gray-200' : ''
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
                    {result.blockId}
                  </td>
                </tr>
              ))
            ];
          })}
        </tbody>
      </table>
    </div>
  );
};
