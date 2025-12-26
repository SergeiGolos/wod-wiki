import React from 'react';
import { ExecutionSnapshot } from '../types/interfaces';
import { RuntimeSpan } from '../../runtime/models/RuntimeSpan';
import { fragmentsToLabel } from '../../runtime/utils/metricsToFragments';

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
    .map(entry => entry.value as RuntimeSpan)
    .sort((a, b) => a.startTime - b.startTime);

  if (spans.length === 0) {
    return <div className="p-4 text-gray-500">No execution history recorded</div>;
  }

  // Helper to format metrics from fragments
  const formatMetric = (span: RuntimeSpan) => {
    const flat = span.fragments.flat();
    const parts = [];

    for (const f of flat) {
      if (f.value !== undefined && f.image && f.fragmentType !== 'effort' && f.fragmentType !== 'action' && f.fragmentType !== 'rounds' && f.fragmentType !== 'timer') {
        parts.push(f.image);
      }
    }

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

            const label = fragmentsToLabel(span.fragments);
            const type = span.fragments.flat().find(f => f.fragmentType === 'rounds' || f.fragmentType === 'timer' || f.fragmentType === 'effort')?.type || 'group';

            return (
              <tr key={span.id} className={`
              ${matchesLine ? 'bg-blue-200 dark:bg-blue-900/50 ring-2 ring-blue-400' : span.isActive() ? 'bg-blue-50' : ''}
            `}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                  {span.blockId.substring(0, 8)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {label}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatMetric(span)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {span.endTime ? `${(span.total() / 1000).toFixed(2)}s` : 'Running...'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
