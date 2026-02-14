/**
 * GridGraphPanel — Collapsible graph area below the grid toolbar.
 *
 * Renders a Recharts LineChart for columns the user has tagged with the
 * 📊 graph toggle. Each tagged column becomes a separate line.
 *
 * Follows the same Recharts patterns as TimelineView:
 * - ResponsiveContainer for auto-sizing
 * - HSL CSS variables for theme-aware styling
 * - ReferenceArea for selected-row highlighting
 */

import React, { useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { GridRow, GridColumn } from './types';
import { useGraphData, type GraphDataPoint } from './useGraphData';

// ─── Props ─────────────────────────────────────────────────────

interface GridGraphPanelProps {
  /** Filtered/sorted grid rows */
  rows: GridRow[];
  /** All column definitions */
  columns: GridColumn[];
  /** IDs of columns currently tagged for graphing */
  graphTaggedColumnIds: string[];
  /** Selected segment/row IDs */
  selectedIds: Set<number>;
  /** Callback when a data point is clicked (selects the row) */
  onSelectRow?: (id: number) => void;
}

// ─── Component ─────────────────────────────────────────────────

export const GridGraphPanel: React.FC<GridGraphPanelProps> = ({
  rows,
  columns,
  graphTaggedColumnIds,
  selectedIds,
  onSelectRow,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data, graphConfigs, hasData } = useGraphData({
    rows,
    columns,
    graphTaggedColumnIds,
    selectedIds,
  });

  const handleChartClick = useCallback(
    (state: any) => {
      if (!state?.activePayload?.[0]) return;
      const point = state.activePayload[0].payload as GraphDataPoint;
      // Find the row by index
      const row = rows.find((r) => r.index === point.index);
      if (row && onSelectRow) {
        onSelectRow(row.id);
      }
    },
    [rows, onSelectRow],
  );

  // Don't render at all if no columns are tagged
  if (graphTaggedColumnIds.length === 0) return null;

  return (
    <div className="border-b border-border bg-background">
      {/* Collapse toggle header */}
      <button
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        onClick={() => setIsCollapsed((p) => !p)}
      >
        <span className="flex items-center gap-1.5">
          <span>📊</span>
          <span>
            Graph — {graphConfigs.map((c) => c.label).join(', ')}
          </span>
        </span>
        <span className="text-[10px]">{isCollapsed ? '▼' : '▲'}</span>
      </button>

      {/* Chart area */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          {!hasData ? (
            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
              No numeric data available for the tagged columns.
            </div>
          ) : (
            <div
              className="w-full bg-muted/30 rounded-lg border border-border p-2"
              style={{ height: 220 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  onClick={handleChartClick}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="index"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 10 }}
                    label={{
                      value: 'Row #',
                      position: 'insideBottom',
                      offset: -5,
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 10 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      fontSize: '12px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    labelFormatter={(idx) => `Row ${idx}`}
                    formatter={(value: number, name: string) => {
                      const cfg = graphConfigs.find((c) => c.dataKey === name);
                      return [
                        `${typeof value === 'number' ? value.toLocaleString() : value}${cfg?.unit ? ` ${cfg.unit}` : ''}`,
                        cfg?.label ?? name,
                      ];
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={24}
                    wrapperStyle={{ fontSize: '11px' }}
                  />

                  {graphConfigs.map((cfg) => (
                    <Line
                      key={cfg.id}
                      type="monotone"
                      dataKey={cfg.dataKey}
                      name={cfg.label}
                      stroke={cfg.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: cfg.color }}
                      activeDot={{ r: 5, stroke: cfg.color, strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
