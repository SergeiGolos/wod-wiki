import React, { MutableRefObject } from 'react';
import { ResultSpan, ITimerRuntime, RuntimeMetric, MetricValue, RuntimeMetricEdit } from '@/core/timer.types';
import EditableMetricCell, { MetricType } from '../common/EditableMetricCell';

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
  onAddMetricUpdate: (update: RuntimeMetricEdit) => void;
  validateMetric?: (value: string | number, type: MetricType) => boolean;
}

const defaultValidator = (value: string | number, type: MetricType): boolean => {
  console.log(`Default validating: ${value} as ${type}`);
  if (type === 'repetitions') {
    // Check if it's a non-negative integer
    const num = Number(value);
    return !isNaN(num) && Number.isInteger(num) && num >= 0;
  } else if (type === 'resistance' || type === 'distance') {
    // Attempt to parse resistance/distance (e.g., '100kg', '5km', '150')
    const parsed = parseMetricInput(String(value));
    // Validation passes if parsing is successful (returns a MetricValue object)
    return parsed !== null;
  }
  return true; // Should not happen
}

export const EventsView: React.FC<EventsViewProps> = ({
  results,
  runtime,
  onAddMetricUpdate,
  validateMetric = defaultValidator
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
  const formatDuration = (duration: number): string => `${(duration / 1000).toFixed(1)}s`;

  const handleSaveMetric = (resultId: string, metricType: MetricType, newValue: number | string) => {
    console.log(`Attempting save - ID: ${resultId}, Type: ${metricType}, New Value: ${newValue}`);

    const [blockKey, indexStr] = resultId.split('-');
    const index = Number(indexStr);
    const resultIndex = sortedResults.findIndex(r => r.blockKey === blockKey && r.index === index);

    if (resultIndex === -1) {
      console.error("Result not found for ID:", resultId);
      return;
    }

    const parsedValue = parseMetricInput(String(newValue));

    if (!parsedValue) {
      console.error(`Failed to parse ${metricType} input:`, newValue);
      // Validation should prevent this, but good to double-check
      return;
    }

    // Construct the update instruction object
    const updateInstruction: RuntimeMetricEdit = {
      blockKey,
      index,
      metricType: metricType as 'repetitions' | 'resistance' | 'distance', // Updated cast
      newValue: parsedValue,
      createdAt: new Date() // Add timestamp
    };

    // Call the new callback to add the update instruction
    onAddMetricUpdate(updateInstruction);

    console.log('Dispatched metric update instruction:', updateInstruction);
  };

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
                const resistanceMetric = result.metrics?.find(m => m.resistance);
                const distanceMetric = result.metrics?.find(m => m.distance);
                const repsMetric = result.metrics?.find(m => m.repetitions);
                const repsValue = repsMetric?.repetitions?.value; // Get the value if it exists
                const resistance = resistanceMetric?.resistance ? `${resistanceMetric.resistance.value}${resistanceMetric.resistance.unit}` : '-';
                const distance = distanceMetric?.distance ? `${distanceMetric.distance.value}${distanceMetric.distance.unit}` : '-';
                const resultId = `${result.blockKey}-${result.index}`;

                if (!resultId) {
                  console.error("Result missing ID, cannot make editable:", result);
                  return (
                    <tr key={`event-missing-id-${Math.random()}`} className="hover:bg-gray-50 opacity-50">
                      <td className="px-3 py-2">... (Missing ID) ...</td>
                      <td className="px-3 py-2">{effort}</td>
                      <td className="px-3 py-2 text-right">{result.duration ? formatDuration(result.duration()) : '-'}</td>
                      <td className="px-3 py-2 text-right">{repsValue > 0 ? repsValue : '-'}</td>
                      <td className="px-3 py-2 text-right">{resistance}</td>
                      <td className="px-3 py-2 text-right">{distance}</td>
                    </tr>
                  )
                }

                return (
                  <tr key={resultId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(result.stop?.timestamp || result.createdAt?.timestamp || 0)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {effort}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      {result.duration ? formatDuration(result.duration()) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      <EditableMetricCell
                        initialValue={repsValue ?? '-'} // Display value or '-' if none exists yet
                        metricType="repetitions" // Set type
                        onSave={(newValue) => handleSaveMetric(resultId, 'repetitions', newValue)}
                        validate={validateMetric}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      <EditableMetricCell
                        initialValue={resistance} // Will be '-' if no data
                        metricType="resistance"
                        onSave={(newValue) => handleSaveMetric(resultId, 'resistance', newValue)}
                        validate={validateMetric}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      <EditableMetricCell
                        initialValue={distance} // Will be '-' if no data
                        metricType="distance"
                        onSave={(newValue) => handleSaveMetric(resultId, 'distance', newValue)}
                        validate={validateMetric}
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
