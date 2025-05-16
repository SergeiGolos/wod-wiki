import React, { MutableRefObject } from 'react';
import { ResultSpan, ITimerRuntime, MetricValue } from '@/core/timer.types';
import EditableMetricCell, { createMetricValidation } from './EditableMetricCell';
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

  // Sort results by timestamp (newest first)
  const sortedResults = results.sort((a, b) => {
    return (b[0].start?.timestamp?.getTime() || 0) - (a[0].start?.timestamp?.getTime() || 0);
  });

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
                // Get the primary effort name for the span
                const effort = result.label || result.metrics?.[0]?.effort || 'Event';
                const resultId = `${result.blockKey}-${result.index}`;

                if (!resultId) {
                  console.error("Result missing ID, cannot make editable:", result);
                  return (
                    <tr key={`event-missing-id-${Math.random()}`} className="hover:bg-gray-50 opacity-50">                      
                      <td className="px-3 py-2">Unknown Event</td>
                      <td className="px-3 py-2 text-right">-</td>
                      <td className="px-3 py-2 text-right">-</td>
                      <td className="px-3 py-2 text-right">-</td>
                      <td className="px-3 py-2 text-right">-</td>
                      <td className="px-3 py-2">... (Missing ID) ...</td>
                    </tr>
                  )
                }
                
                // Extract metric values by type directly from metrics array
                const repetitionValues: [string, MetricValue][] = [];
                const resistanceValues: [string, MetricValue][] = [];
                const distanceValues: [string, MetricValue][] = [];
                
                // Go through each metric and extract values by type
                result.metrics?.forEach(metric => {
                  const effortName = metric.effort || effort;
                  
                  // Find each type of value in the values array
                  const rep = metric.values?.find(v => v.type === 'repetitions');
                  const resistance = metric.values?.find(v => v.type === 'resistance');
                  const distance = metric.values?.find(v => v.type === 'distance');
                  
                  // Add to the appropriate arrays with the effort name
                  if (rep) repetitionValues.push([effortName, rep]);
                  if (resistance) resistanceValues.push([effortName, resistance]);
                  if (distance) distanceValues.push([effortName, distance]);
                });
                
                // If there are no metrics, display a row with just the effort name
                if (repetitionValues.length === 0 && 
                    resistanceValues.length === 0 && 
                    distanceValues.length === 0) {
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
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                        {result.start?.timestamp ? formatTimestamp(result.start.timestamp.getTime()) : '-'}
                      </td>
                    </tr>
                  );
                }
                
                // For each repetition metric, create a row
                return (
                  <React.Fragment key={resultId}>
                    {repetitionValues.map(([effortName, metricValue], metricIndex) => (
                      <tr key={`${resultId}-rep-${metricIndex}`} className={cn("hover:bg-gray-50", hidden ? 'opacity-50' : '')}>                    
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-left overflow-hidden max-w-xs">
                          <span 
                            className="cursor-pointer hover:underline overflow-hidden text-ellipsis whitespace-nowrap block max-w-xs"
                            onClick={() => onEffortClick(effortName)}
                            title={effortName}
                          >
                            {effortName}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                          {result.duration ? formatDuration(result.duration()) : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                          <EditableMetricCell
                            initialValue={metricValue} 
                            metricType="repetitions"
                            onSave={() => {}}
                            blockKey={result.blockKey!} index={result.index!}                      
                            validate={repValidation}
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                          {result.start?.timestamp ? formatTimestamp(result.start.timestamp.getTime()) : '-'}
                        </td>
                      </tr>
                    ))}
                    
                    {resistanceValues.map(([effortName, metricValue], metricIndex) => (
                      <tr key={`${resultId}-res-${metricIndex}`} className={cn("hover:bg-gray-50", hidden ? 'opacity-50' : '')}>                    
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-left overflow-hidden max-w-xs">
                          <span 
                            className="cursor-pointer hover:underline overflow-hidden text-ellipsis whitespace-nowrap block max-w-xs"
                            onClick={() => onEffortClick(effortName)}
                            title={effortName}
                          >
                            {effortName} 💪
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                          {result.duration ? formatDuration(result.duration()) : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                          <EditableMetricCell
                            initialValue={metricValue}
                            metricType="resistance"
                            onSave={() => {}}
                            blockKey={result.blockKey!} index={result.index!}   
                            validate={resistanceValidation}
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                          {result.start?.timestamp ? formatTimestamp(result.start.timestamp.getTime()) : '-'}
                        </td>
                      </tr>
                    ))}
                    
                    {distanceValues.map(([effortName, metricValue], metricIndex) => (
                      <tr key={`${resultId}-dist-${metricIndex}`} className={cn("hover:bg-gray-50", hidden ? 'opacity-50' : '')}>                    
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-left overflow-hidden max-w-xs">
                          <span 
                            className="cursor-pointer hover:underline overflow-hidden text-ellipsis whitespace-nowrap block max-w-xs"
                            onClick={() => onEffortClick(effortName)}
                            title={effortName}
                          >
                            {effortName} 📏
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                          {result.duration ? formatDuration(result.duration()) : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                          <EditableMetricCell
                            initialValue={metricValue}
                            metricType="distance"
                            onSave={() => {}}
                            blockKey={result.blockKey!} index={result.index!}   
                            validate={distanceValidation}
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                          {result.start?.timestamp ? formatTimestamp(result.start.timestamp.getTime()) : '-'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">No events recorded</div>
      )}
    </div>
  );
};
