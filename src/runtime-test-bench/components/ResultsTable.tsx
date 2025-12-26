import React from 'react';
import { ExecutionSnapshot } from '../types/interfaces';
import { TrackedSpan, SpanMetrics } from '../../runtime/models/TrackedSpan';

interface ResultsTableProps {
  snapshot: ExecutionSnapshot | null;
  highlightedLine?: number;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ snapshot, highlightedLine }) => {
  if (!snapshot) {
    return <div className="p-4 text-gray-500">No execution data available</div>;
  }

  // Filter for execution spans (mapped to 'span' type by RuntimeAdapter)
  const spans = snapshot.memory.entries
    .filter(entry => entry.type === 'span')
    .map(entry => entry.value as TrackedSpan)
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
          {spans.map((span) => {
            // Check if span's blockId matches a block with the highlighted line
            const matchesLine = highlightedLine !== undefined &&
              snapshot?.stack.blocks.some(block =>
                block.key === span.blockId && block.lineNumber === highlightedLine
              );

            return (
              <tr key={span.id} className={`
              ${matchesLine ? 'bg-blue-200 dark:bg-blue-900/50 ring-2 ring-blue-400' : span.status === 'active' ? 'bg-blue-50' : ''}
            `}>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
