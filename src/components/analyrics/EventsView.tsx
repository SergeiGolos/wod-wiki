import React, { MutableRefObject } from 'react';
import { ResultSpan, MetricValue } from '@/core/timer.types';

interface EventsViewProps {
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;
}

export const EventsView: React.FC<EventsViewProps> = ({ results, runtime }) => {
  // Sort the results in reverse chronological order
  const sortedResults = [...results].sort((a, b) => {
    // Use the stop timestamp for comparison, or createdAt if stop is not available
    const timeA = a.stop?.timestamp || a.start?.timestamp || Date.now();
    const timeB = b.stop?.timestamp || b.start?.timestamp || Date.now();
    return timeB - timeA; // Reverse order (newest first)
  });

  // Format timestamp to a readable format
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.toLocaleTimeString()}`;
  };

  // Format duration in seconds
  const formatDuration = (duration: number): string => {
    return `${(duration / 1000).toFixed(1)}s`;
  };

  // Format resistance or distance value
  const formatMetricValue = (metricValue?: MetricValue): string => {
    return metricValue ? `${metricValue.value}${metricValue.unit}` : '-';
  };

  return (
    <div className="events-view">
      {sortedResults.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Effort
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Reps
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Resistance
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Distance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedResults.map((result, index) => {
                // Get the effort name from the first metric if available
                const effort = result.metrics && result.metrics.length > 0 
                  ? result.metrics[0].effort 
                  : 'Event';
                
                // Calculate totals for this result span
                const totalReps = result.metrics?.reduce((sum, m) => sum + m.repetitions, 0) || 0;
                
                // Find the first metric with resistance and distance values
                const resistanceMetric = result.metrics?.find(m => m.resistance)?.resistance;
                const distanceMetric = result.metrics?.find(m => m.distance)?.distance;
                
                return (
                  <tr key={`event-${index}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(result.stop?.timestamp || 0)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {effort}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {result.duration ? formatDuration(result.duration()) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {totalReps > 0 ? totalReps : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatMetricValue(resistanceMetric)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatMetricValue(distanceMetric)}
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
