import React from 'react';
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { MetricValue } from "@/core/MetricValue";
import EditableMetricCell, { createMetricValidation } from './EditableMetricCell';
import { cn } from '@/core/utils';

interface EventsViewProps {
  results: [RuntimeSpan, boolean][];
  onEffortClick: (effort: string) => void;  
}

interface EffortRowData {
  id: string;
  effortName: string;
  duration?: string;
  repetitions?: MetricValue;
  resistance?: MetricValue;
  distance?: MetricValue;
  startTime?: string;
  blockKey: string;
  index?: number;
  hidden: boolean;
}

export const EventsView: React.FC<EventsViewProps> = ({
  results,
  onEffortClick
}) => {

  // Sort results by timestamp (newest first)
  const sortedResults = [...results].sort((a, b) => {
    const aStartTime = a[0].timeSpans?.[0]?.start?.timestamp?.getTime() || 0;
    const bStartTime = b[0].timeSpans?.[0]?.start?.timestamp?.getTime() || 0;
    return bStartTime - aStartTime;
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
  
  const transformedResults: EffortRowData[] = sortedResults.flatMap(([result, hidden]) => {
    if (!result.blockKey) {
      console.error("Result missing blockKey, cannot make editable:", result);
      return []; // Skip this result
    }

    const firstTimeSpan = result.timeSpans?.[0];
    const lastTimeSpan = result.timeSpans?.[result.timeSpans.length - 1];
    let calculatedDuration = '-';
    if (firstTimeSpan?.start?.timestamp && lastTimeSpan?.stop?.timestamp) {
      const durationMs = lastTimeSpan.stop.timestamp.getTime() - firstTimeSpan.start.timestamp.getTime();
      calculatedDuration = formatDuration(durationMs);
    }

    return result.metrics?.map(metricEntry => {
      const effortName = metricEntry.effort || 'Event';
      const rowData: EffortRowData = {
        id: `${result.blockKey}-${metricEntry.sourceId || effortName}-${result.index}`, // Ensure unique ID
        effortName,
        duration: calculatedDuration,
        startTime: firstTimeSpan?.start?.timestamp ? formatTimestamp(firstTimeSpan.start.timestamp.getTime()) : '-',
        blockKey: result.blockKey!,
        index: result.index,
        hidden,
      };

      metricEntry.values?.forEach(value => {
        if (value.type === 'repetitions') {
          rowData.repetitions = value;
        } else if (value.type === 'resistance') {
          rowData.resistance = value;
        } else if (value.type === 'distance') {
          rowData.distance = value;
        }
      });
      return rowData;
    }) || [];
  }).filter(row => row !== null) as EffortRowData[];
  
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
              {transformedResults.map((row) => {
                // Get the primary effort name for the span
                // const effort = result.metrics?.[0]?.effort || 'Event'; // No longer needed directly here
                // const resultId = `${result.blockKey}`; // row.id is now the key

                // if (!resultId || !result.blockKey) { // Handled in transformation
                //   console.error("Result missing blockKey, cannot make editable:", result);
                //   return (
                //     <tr key={`event-missing-id-${resultId}`} className="hover:bg-gray-50 opacity-50 fade-in">                      
                //       <td className="px-3 py-2">Unknown Event</td>
                //       <td className="px-3 py-2 text-center">-</td>
                //       <td className="px-3 py-2 text-center">-</td>
                //       <td className="px-3 py-2 text-center">-</td>
                //       <td className="px-3 py-2 text-center">-</td>
                //       <td className="px-3 py-2 text-right">... (Missing ID) ...</td>
                //     </tr>
                //   );
                // }
                
                // Consolidate all displayable metrics into a single array // Logic moved to transformation
                // const allDisplayableMetrics: {
                //   effortName: string;
                //   metricValue: MetricValue;
                //   type: 'repetitions' | 'resistance' | 'distance';
                // }[] = [];
                
                // result.metrics?.forEach(metricEntry => {
                //   const currentEffortName = metricEntry.effort || effort;
                //   metricEntry.values?.forEach(value => {
                //     if (value.type === 'repetitions' || value.type === 'resistance' || value.type === 'distance') {
                //       allDisplayableMetrics.push({
                //         effortName: currentEffortName,
                //         metricValue: value,
                //         type: value.type,
                //       });
                //     }
                //   });
                // });
                
                // If there are no displayable metrics, display a simpler row with just the effort name
                // This condition might need adjustment based on how an "empty" row should be represented
                if (!row.repetitions && !row.resistance && !row.distance) {
                  return (
                    <tr key={row.id} className={cn("hover:bg-gray-50 fade-in", row.hidden ? 'opacity-50' : '')}>                    
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-left overflow-hidden max-w-xs">
                        <span 
                          className="cursor-pointer hover:underline overflow-hidden text-ellipsis whitespace-nowrap block max-w-xs"
                          onClick={() => onEffortClick(row.effortName)}
                          title={row.effortName}
                        >
                          {row.effortName}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                        {row.duration}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                        {row.startTime}
                      </td>
                    </tr>
                  );
                }
                
                // For each displayable metric, create a row // Now we create one row per transformed item
                return (
                  // <React.Fragment key={resultId}> // No longer needed
                    // {allDisplayableMetrics.map(({ effortName, metricValue, type }, metricIndex) => { // Iterate over transformedResults
                      // let effortDisplay = effortName; // Use row.effortName
                      // let validationSchema = repValidation; // Default

                      // if (type === 'resistance') { // Check row.resistance
                      //   effortDisplay = `${effortName} 💪`;
                      //   validationSchema = resistanceValidation;
                      // } else if (type === 'distance') { // Check row.distance
                      //   effortDisplay = `${effortName} 📏`;
                      //   validationSchema = distanceValidation;
                      // }

                      // return ( // This becomes the main row structure
                        <tr key={row.id} className={cn("hover:bg-gray-50 fade-in", row.hidden ? 'opacity-50' : '')}>                    
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-left overflow-hidden max-w-xs">
                            <span 
                              className="cursor-pointer hover:underline overflow-hidden text-ellipsis whitespace-nowrap block max-w-xs"
                              onClick={() => onEffortClick(row.effortName)} // Use original effortName for click handler
                              title={row.effortName} // Use original effortName for title
                            >
                              {row.effortName} {/* Displayed effort name with potential emoji */}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {row.duration}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {row.repetitions ? (
                              <EditableMetricCell
                                initialValue={row.repetitions} 
                                metricType="repetitions"
                                onSave={() => {}} // Placeholder onSave
                                blockKey={row.blockKey} 
                                index={row.index!}                      
                                validate={repValidation} // Use specific validation
                              />
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {row.resistance ? (
                              <EditableMetricCell
                                initialValue={row.resistance}
                                metricType="resistance"
                                onSave={() => {}} // Placeholder onSave
                                blockKey={row.blockKey} 
                                index={row.index!}   
                                validate={resistanceValidation} // Use specific validation
                              />
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                            {row.distance ? (
                              <EditableMetricCell
                                initialValue={row.distance}
                                metricType="distance"
                                onSave={() => {}} // Placeholder onSave
                                blockKey={row.blockKey} 
                                index={row.index!}   
                                validate={distanceValidation} // Use specific validation
                              />
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            {row.startTime}
                          </td>
                        </tr>
                      // );
                    // })}
                  // </React.Fragment> // No longer needed
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
