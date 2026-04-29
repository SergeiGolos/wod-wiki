/**
 * MetricTable — renders a resolved metric table with level columns.
 *
 * Columns are colour-coded by state:
 *   ● set        → white
 *   ↑ inherited  → gray
 *   ✕ suppressed → red/dim
 *   ~ estimate   → yellow
 *   ∑ computed   → blue
 *   ◎ collected  → green
 *   … pending    → gray/italic
 */

import React from 'react';
import type { ResolvedMetricRow, SpanLevel, MetricEntryState } from '../../types/inspector';

const STATE_COLORS: Record<MetricEntryState, string> = {
  set:        'text-white',
  inherited:  'text-gray-500',
  suppressed: 'text-red-700 line-through',
  estimate:   'text-yellow-400',
  computed:   'text-blue-400',
  collected:  'text-green-400',
  pending:    'text-gray-600 italic',
};

interface MetricTableProps {
  rows: ResolvedMetricRow[];
  columns: SpanLevel[];
  /** Optional column labels override (defaults to level name) */
  columnLabels?: Partial<Record<SpanLevel, string>>;
}

export const MetricTable: React.FC<MetricTableProps> = ({ rows, columns, columnLabels }) => {
  if (rows.length === 0) {
    return <p className="text-gray-600 text-xs font-mono italic">no metrics</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs font-mono w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left px-2 py-1 text-gray-400 font-semibold">metric</th>
            <th className="text-left px-2 py-1 text-gray-400 font-normal">type</th>
            {columns.map(col => (
              <th key={col} className="text-center px-2 py-1 text-gray-400 font-semibold capitalize">
                {columnLabels?.[col] ?? col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.metricKey} className="border-b border-gray-800 hover:bg-gray-800/40">
              <td className="px-2 py-1 text-gray-300">{row.metricKey}</td>
              <td className="px-2 py-1 text-gray-600">{row.metricType}</td>
              {columns.map(col => {
                const cell = row.cells[col];
                return (
                  <td key={col} className="px-2 py-1 text-center">
                    {cell ? (
                      <span className={STATE_COLORS[cell.state]} title={cell.state}>
                        {cell.displayValue}
                      </span>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
