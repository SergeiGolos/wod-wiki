import React, { MutableRefObject } from 'react';
import { ResultSpan, ITimerRuntime, TimerFromSeconds } from '@/core/timer.types';
import EditableMetricCell, { createMetricValidation } from '../common/EditableMetricCell';
import { cn } from '@/core/utils';

interface EventsViewProps {
  results: [ResultSpan, boolean][];
  runtime: MutableRefObject<ITimerRuntime | undefined>;  
  onEffortClick: (effort: string) => void;  
}

export const EventsView: React.FC<EventsViewProps> = ({
  results,
  runtime,
  onEffortClick
}) => {
  // Filter results based on the selected effort  
  const sortedResults = results.sort((a, b) => {
    return (b[0].start?.timestamp?.getTime() || 0) - (a[0].start?.timestamp?.getTime() || 0);
  });

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const formatDuration = (duration: number): string => {
    const clock = new TimerFromSeconds(duration/1000).toClock();
    return `${clock[0]}.${clock[1][0]}`;
  };
  
  const repValidation = createMetricValidation(['']);
  const resistanceValidation = createMetricValidation(['kg', 'lbs', 'lb']);
  const distanceValidation = createMetricValidation(['m', 'km', 'mile']);
  
  return (
    <div className="events-view">
      {sortedResults.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-24 md:w-1/3 px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Effort</th>
                <th className="w-20 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                <th className="w-20 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Reps</th>
                <th className="w-20 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Resistance</th>
                <th className="w-20 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Distance</th>
                <th className="w-24 px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>                
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedResults.map(([result, hidden]) => {
                const effort = result.metrics?.[0]?.effort || 'Event';
                const resistance = result.metrics?.find(m => m.resistance);
                const distance = result.metrics?.find(m => m.distance);
                const repsValue = result.metrics?.find(m => m.repetitions);
                const resultId = `${result.blockKey}-${result.index}`;

                if (!resultId) {
                  console.error("Result missing ID, cannot make editable:", result);
                  return (
                    <tr key={`event-missing-id-${Math.random()}`} className="hover:bg-gray-50 opacity-50">                      
                      <td className="px-3 py-2">{effort}</td>
                      <td className="px-3 py-2 text-right">{formatDuration(result.duration())}</td>
                      <td className="px-3 py-2 text-right">{repsValue?.repetitions?.value || '-'}</td>
                      <td className="px-3 py-2 text-right">{resistance?.resistance?.value || '-'}</td>
                      <td className="px-3 py-2 text-right">{distance?.distance?.value || '-'}</td>
                      <td className="px-3 py-2">... (Missing ID) ...</td>
                    </tr>
                  )
                }

                return (
                  <tr key={resultId} className={cn("hover:bg-gray-50", hidden ? 'opacity-50' : '')}>                    
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-left overflow-hidden max-w-xs">
                      <span 
                        className="cursor-pointer hover:underline overflow-hidden text-ellipsis whitespace-nowrap block max-w-xs"
                        onClick={() => onEffortClick(effort)}
                        title={effort}
                      >
                        {effort}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                      {result.duration ? formatDuration(result.duration()) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                      <EditableMetricCell
                        initialValue={repsValue?.repetitions} // Display value or '-' if none exists yet
                        metricType="repetitions" // Set type
                        onSave={(update) => runtime.current?.edit?.(update)}
                        blockKey={result.blockKey!} index={result.index!}                      
                        validate={repValidation}
                        />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                      <EditableMetricCell
                        initialValue={resistance?.resistance} // Will be '-' if no data
                        metricType="resistance"
                        onSave={(update) => runtime.current?.edit?.(update)}
                        blockKey={result.blockKey!} index={result.index!}   
                        validate={resistanceValidation}
                        />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                      <EditableMetricCell
                        initialValue={distance?.distance} // Will be '-' if no data
                        metricType="distance"
                        onSave={(update) => runtime.current?.edit?.(update)}
                        blockKey={result.blockKey!} index={result.index!}   
                        validate={distanceValidation}
                        />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatTimestamp(result.stop?.timestamp?.getTime() || result.start?.timestamp?.getTime() || 0)}
                    </td>
                  </tr>
                );
              })}          
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">No events recorded yet.</p>
      )}
    </div>
  );
};
