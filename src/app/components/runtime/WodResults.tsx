import React, { use, useEffect, useState } from 'react';
import { RuntimeBlock } from '../../../lib/RuntimeBlock';
import { RuntimeResult } from '@/lib/RuntimeResult';
import { TimerEvent, TimerRuntime } from '@/lib/timer.runtime';
import { CountDownDurationHandler } from '@/lib/CountDownDurationHandler';

interface WodResultsProps {
  results: TimerEvent[];
  runtime: TimerRuntime;
}

export const WodResults: React.FC<WodResultsProps> = ({ results, runtime}) => {
  // Group results by blockId
  let groupedResults = Array.from(results.reduce((resultMap, item : TimerEvent) => {      
    const key = `${item.blockId}|${item.index}`;  
      if (!resultMap.has(key)) {
        resultMap.set(key, []);
      }  
      resultMap.get(key)!.push(item);  
      return resultMap;
    }, new Map<string, TimerEvent[]>()));
 
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
            console.log("MAP", groupId, group);
            const blockId = (groupId.split('|')[0] as any as number) * 1;
            const block = runtime[blockId];
            console.log("MAP2", groupId, group, block);
            //const parts = block?.[0]?.getParts() || [];

            return (<React.Fragment key={groupId}>              
              <tr className="bg-gray-100">
                <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-gray-700">
                  Block {JSON.stringify(block)}
                </td>
              </tr>              
              {group.map((result, index) => (
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
              ))}
            </React.Fragment>
          )})}
        </tbody>
      </table>
    </div>
  );
};
