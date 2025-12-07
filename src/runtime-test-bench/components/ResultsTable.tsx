import React from 'react';
import { ExecutionSnapshot } from '../types/interfaces';
import { ExecutionSpan, SpanMetrics } from '../../runtime/models/ExecutionSpan';
import { EXECUTION_SPAN_TYPE } from '../../runtime/ExecutionTracker';

interface ResultsTableProps {
  snapshot: ExecutionSnapshot | null;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ snapshot }) => {
  if (!snapshot) {
    return <div className="p-4 text-gray-500">No execution data available</div>;
  }

  // Filter for execution spans
  const spans = snapshot.memory.entries
    .filter(entry => entry.type === EXECUTION_SPAN_TYPE)
    .map(entry => entry.value as ExecutionSpan)
    .sort((a, b) => a.startTime - b.startTime);

  if (spans.length === 0) {
    return <div className="p-4 text-gray-500">No execution history recorded</div>;
  }

  // Helper to format metrics
  const formatMetric = (metrics: SpanMetrics) => {
    const parts = [];
    if (metrics.reps) parts.push(`${metrics.reps.value} reps`);
    if (metrics.weight) parts.push(`${metrics.weight.value} ${metrics.weight.unit}`);
    if (metrics.distance) parts.push(`${metrics.distance.value} ${metrics.distance.unit}`);
    if (metrics.calories) parts.push(`${metrics.calories.value} cal`);
    if (metrics.time) parts.push(`${(metrics.time.value / 1000).toFixed(1)}s`);
    
    return parts.join(', ') || '-';
  };

  return (
    <div className="w-full overflow-x-auto border-t border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Block ID
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Label
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Metrics
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {spans.map((span) => (
            <tr key={span.id} className={span.status === 'active' ? 'bg-blue-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                {span.blockId.substring(0, 8)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {span.type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {span.label}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatMetric(span.metrics)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {span.endTime ? `${((span.endTime - span.startTime) / 1000).toFixed(2)}s` : 'Running...'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
