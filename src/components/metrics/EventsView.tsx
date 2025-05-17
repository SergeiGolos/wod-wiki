import React from 'react';
import { ResultSpan, MetricValue } from '@/core/timer.types';
import EditableMetricCell, { createMetricValidation } from './EditableMetricCell';
import { cn } from '@/core/utils';

interface EventsViewProps {
  results: [ResultSpan, boolean][];
  onEffortClick: (effort: string) => void;  
}

export const EventsView: React.FC<EventsViewProps> = ({
  results,
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

                if (!resultId || !result.blockKey || typeof result.index === 'undefined') {
                  console.error("Result missing ID, blockKey, or index, cannot make editable:", result);
                  return (
                    <tr key={`event-missing-id-${Math.random()}`} className="hover:bg-gray-50 opacity-50">                      
                      <td className="px-3 py-2">Unknown Event</td>
                      <td className="px-3 py-2 text-center">-</td>
                      <td className="px-3 py-2 text-center">-</td>
                      <td className="px-3 py-2 text-center">-</td>
                      <td className="px-3 py-2 text-center">-</td>
                      <td className="px-3 py-2 text-right">... (Missing ID) ...</td>
                    </tr>
                  );
                }
                
                // Consolidate all displayable metrics into a single array
                const allDisplayableMetrics: {
                  effortName: string;
                  metricValue: MetricValue;
                  type: 'repetitions' | 'resistance' | 'distance';
                }[] = [];
                
                result.metrics?.forEach(metricEntry => {
                  const currentEffortName = metricEntry.effort || effort;
                  metricEntry.values?.forEach(value => {
                    if (value.type === 'repetitions' || value.type === 'resistance' || value.type === 'distance') {
                      allDisplayableMetrics.push({
                        effortName: currentEffortName,
                        metricValue: value,
                        type: value.type,
                      });
                    }
                  });
                });
                
                // If there are no displayable metrics, display a simpler row with just the effort name
                if (allDisplayableMetrics.length === 0) {
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
                
                // For each displayable metric, create a row
                return (
                  <React.Fragment key={resultId}>
                    {allDisplayableMetrics.map(({ effortName, metricValue, type }, metricIndex) => {
                      let effortDisplay = effortName;
                      let validationSchema = repValidation; // Default

                      if (type === 'resistance') {
                        effortDisplay = `${effortName} 💪`;
                        validationSchema = resistanceValidation;
                      } else if (type === 'distance') {
                        effortDisplay = `${effortName} 📏`;
                        validationSchema = distanceValidation;
                      }

                      return (
                        <tr key={`${resultId}-${type}-${metricIndex}`} className={cn("hover:bg-gray-50", hidden ? 'opacity-50' : '')}>                    
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-left overflow-hidden max-w-xs">
                            <span 
                              className="cursor-pointer hover:underline overflow-hidden text-ellipsis whitespace-nowrap block max-w-xs"
                              onClick={() => onEffortClick(effortName)} // Use original effortName for click handler
                              title={effortName} // Use original effortName for title
                            >
                              {effortDisplay} {/* Displayed effort name with potential emoji */}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {result.duration ? formatDuration(result.duration()) : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {type === 'repetitions' ? (
                              <EditableMetricCell
                                initialValue={metricValue} 
                                metricType="repetitions"
                                onSave={() => {}} // Placeholder onSave
                                blockKey={result.blockKey!} 
                                index={result.index!}                      
                                validate={validationSchema}
                              />
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {type === 'resistance' ? (
                              <EditableMetricCell
                                initialValue={metricValue}
                                metricType="resistance"
                                onSave={() => {}} // Placeholder onSave
                                blockKey={result.blockKey!} 
                                index={result.index!}   
                                validate={validationSchema}
                              />
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {type === 'distance' ? (
                              <EditableMetricCell
                                initialValue={metricValue}
                                metricType="distance"
                                onSave={() => {}} // Placeholder onSave
                                blockKey={result.blockKey!} 
                                index={result.index!}   
                                validate={validationSchema}
                              />
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            {result.start?.timestamp ? formatTimestamp(result.start.timestamp.getTime()) : '-'}
                          </td>
                        </tr>
                      );
                    })}
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
