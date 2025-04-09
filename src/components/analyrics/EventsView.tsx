import React, { MutableRefObject } from 'react';
import { ResultSpan, ITimerRuntime, MetricValue, RuntimeMetricEdit, TimerFromSeconds } from '@/core/timer.types';
import EditableMetricCell, { createMetricValidation } from '../common/EditableMetricCell';

const parseMetricInput = (input: string): MetricValue | null => {
  const match = String(input).trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  if (match && match[1] && match[2]) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase(); // Normalize unit
    if (!isNaN(value)) {
      return { value, unit };
    }
  }
  return null; // Return null if parsing fails
};

interface EventsViewProps {
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;  
}

export const EventsView: React.FC<EventsViewProps> = ({
  results,
  runtime
}) => {
  const sortedResults = [...results].sort((a, b) => {
    const timeA = a.stop?.timestamp || a.start?.timestamp || new Date();
    const timeB = b.stop?.timestamp || b.start?.timestamp || new Date();
    return timeB.getTime() - timeA.getTime();
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Effort</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Reps</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Resistance</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Distance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedResults.map((result) => {
                const effort = result.metrics?.[0]?.effort || 'Event';
                const resistance = result.metrics?.find(m => m.resistance);
                const distance = result.metrics?.find(m => m.distance);
                const repsValue = result.metrics?.find(m => m.repetitions);
                const resultId = `${result.blockKey}-${result.index}`;

                if (!resultId) {
                  console.error("Result missing ID, cannot make editable:", result);
                  return (
                    <tr key={`event-missing-id-${Math.random()}`} className="hover:bg-gray-50 opacity-50">
                      <td className="px-3 py-2">... (Missing ID) ...</td>
                      <td className="px-3 py-2">{effort}</td>
                      <td className="px-3 py-2 text-right">{result.duration ? formatDuration(result.duration()) : '-'}</td>
                      <td className="px-3 py-2 text-right">{repsValue?.repetitions?.value || '-'}</td>
                      <td className="px-3 py-2 text-right">{resistance?.resistance?.value || '-'}</td>
                      <td className="px-3 py-2 text-right">{distance?.distance?.value || '-'}</td>
                    </tr>
                  )
                }

                return (
                  <tr key={resultId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(result.stop?.timestamp?.getTime() || result.start?.timestamp?.getTime() || 0)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {effort}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      {result.duration ? formatDuration(result.duration()) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      <EditableMetricCell
                        initialValue={repsValue?.repetitions} // Display value or '-' if none exists yet
                        metricType="repetitions" // Set type
                        onSave={(update) => runtime.current?.edit?.(update)}
                        blockKey={result.blockKey!} index={result.index!}                      
                        validate={repValidation}
                        />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      <EditableMetricCell
                        initialValue={resistance?.resistance} // Will be '-' if no data
                        metricType="resistance"
                        onSave={(update) => runtime.current?.edit?.(update)}
                        blockKey={result.blockKey!} index={result.index!}   
                        validate={resistanceValidation}
                        />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      <EditableMetricCell
                        initialValue={distance?.distance} // Will be '-' if no data
                        metricType="distance"
                        onSave={(update) => runtime.current?.edit?.(update)}
                        blockKey={result.blockKey!} index={result.index!}   
                        validate={distanceValidation}
                        />
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
