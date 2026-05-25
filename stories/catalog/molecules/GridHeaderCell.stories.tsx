/**
 * Catalog / Molecules / GridHeaderCell
 *
 * The sortable column header atoms used in the metric review grid.
 * Three sub-components from GridHeader.tsx are showcased here:
 *
 *  HeaderCell      – sortable <th> with icon, label, sort indicator,
 *                    and optional graph-toggle button
 *  FilterCell      – per-column filter <input> inside a <th>
 *  AddColumnButton – ＋ button dropdown for adding metric columns
 *
 * Source: `src/components/review-grid/GridHeader.tsx`
 * Types:  `src/components/review-grid/column-definition-language.ts`
 *
 * Stories:
 *  1. HeaderCellVariants  – unsorted / sorted asc / sorted desc / graphed
 *  2. FilterCellVariants  – filterable vs. non-filterable columns
 *  3. AddColumn           – the ＋ button with available metric types
 *  4. FullHeaderRow       – all three atoms composed as a realistic header
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MetricType } from '@/core/models/Metric';
import type { GridSortConfig } from '@/components/review-grid/types';
import type { ColumnDef } from '@/components/review-grid/column-definition-language';
import { HeaderCell, FilterCell, AddColumnButton } from '@/components/review-grid/GridHeader';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof HeaderCell> = {
  title: 'catalog/molecules/workout/GridHeaderCell',
  component: HeaderCell,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof HeaderCell>;

// ─── Sample columns (CDL ColumnDef) ───────────────────────────────────────────

const COLUMNS: ColumnDef[] = [
  {
    id: 'action',
    label: 'Action',
    source: { type: 'metric-type', metricType: MetricType.Action },
    format: { type: 'text' },
    sort: { type: 'text', extractor: (c) => (c as any)?.metrics?.[0]?.value ?? '' },
    filter: { extractor: (c) => (c as any)?.metrics?.[0]?.value ?? '', caseInsensitive: true },
  },
  {
    id: 'reps',
    label: 'Reps',
    source: { type: 'metric-type', metricType: MetricType.Rep },
    format: { type: 'number' },
    sort: { type: 'numeric', extractor: (c) => (c as any)?.metrics?.[0]?.value ?? 0 },
    filter: { extractor: (c) => String((c as any)?.metrics?.[0]?.value ?? ''), caseInsensitive: true },
    graph: { extractor: (c) => (c as any)?.metrics?.[0]?.value, axisLabel: 'Reps', unit: 'reps' },
  },
  {
    id: 'time',
    label: 'Time',
    source: { type: 'metric-type', metricType: MetricType.Duration },
    format: { type: 'time' },
    sort: { type: 'numeric', extractor: (c) => (c as any)?.metrics?.[0]?.value ?? 0 },
    graph: { extractor: (c) => (c as any)?.metrics?.[0]?.value, axisLabel: 'Duration', unit: 's' },
  },
  {
    id: 'notes',
    label: 'Notes',
    source: { type: 'metric-type', metricType: MetricType.Text },
    format: { type: 'text' },
    filter: { extractor: (c) => (c as any)?.metrics?.[0]?.value ?? '', caseInsensitive: true },
  },
];

// ─── Stories ──────────────────────────────────────────────────────────────────

/** HeaderCell in all four sort/graph states. */
export const HeaderCellVariants: Story = {
  render: () => (
    <table className="border-collapse">
      <thead>
        <tr className="bg-muted/50 border-b border-border">
          <HeaderCell column={COLUMNS[0]}                            sortConfig={undefined}                           onSort={() => {}} onToggleGraph={() => {}} isGraphed={false} />
          <HeaderCell column={COLUMNS[1]}                            sortConfig={{ columnId: 'reps', direction: 'asc' }} onSort={() => {}} onToggleGraph={() => {}} isGraphed={false} />
          <HeaderCell column={COLUMNS[2]}                            sortConfig={{ columnId: 'time', direction: 'desc' }} onSort={() => {}} onToggleGraph={() => {}} isGraphed={false} />
          <HeaderCell column={COLUMNS[1]}                            sortConfig={undefined}                           onSort={() => {}} onToggleGraph={() => {}} isGraphed={true} />
        </tr>
      </thead>
    </table>
  ),
};

/** FilterCell — filterable column shows input; non-filterable is blank. */
export const FilterCellVariants: Story = {
  render: () => {
    const [filters, setFilters] = React.useState<Record<string, string>>({});
    return (
      <table className="border-collapse">
        <thead>
          <tr className="bg-muted/30 border-b border-border/50">
            {COLUMNS.map(col => (
              <FilterCell
                key={col.id}
                column={col}
                value={filters[col.id] ?? ''}
                onChange={(id, v) => setFilters(f => ({ ...f, [id]: v }))}
              />
            ))}
          </tr>
        </thead>
      </table>
    );
  },
};

/** AddColumnButton — opens a dropdown of available metric types. */
export const AddColumn: Story = {
  render: () => (
    <table className="border-collapse">
      <thead>
        <tr className="bg-muted/50 border-b border-border">
          <th className="py-2 px-2 text-xs text-muted-foreground">Reps</th>
          <th className="py-2 px-2 text-xs text-muted-foreground">Time</th>
          <th className="py-2 px-1 w-8">
            <AddColumnButton
              availableToAdd={[MetricType.Effort, MetricType.Distance, MetricType.Resistance, MetricType.Rounds]}
              onAddColumn={(type) => alert(`Add column: ${type}`)}
            />
          </th>
        </tr>
      </thead>
    </table>
  ),
};

/** Realistic full header row with sort, filter, and add-column. */
export const FullHeaderRow: Story = {
  render: () => {
    const [sortConfigs, setSortConfigs] = React.useState<GridSortConfig[]>([]);
    const [filters, setFilters] = React.useState<Record<string, string>>({});
    const [graphedIds, setGraphedIds] = React.useState<Set<string>>(new Set());

    const handleSort = (columnId: string) => {
      setSortConfigs(prev => {
        const existing = prev.find(s => s.columnId === columnId);
        if (!existing) return [{ columnId, direction: 'asc' as const }];
        if (existing.direction === 'asc') return [{ columnId, direction: 'desc' as const }];
        return [];
      });
    };

    const handleToggleGraph = (columnId: string) => {
      setGraphedIds(prev => {
        const next = new Set(prev);
        if (next.has(columnId)) next.delete(columnId);
        else next.add(columnId);
        return next;
      });
    };

    return (
      <table className="border-collapse w-[560px]">
        <thead className="bg-muted/50 sticky top-0 z-10">
          <tr className="border-b border-border">
            {COLUMNS.map(col => (
              <HeaderCell
                key={col.id}
                column={col}
                sortConfig={sortConfigs.find(s => s.columnId === col.id)}
                onSort={handleSort}
                onToggleGraph={handleToggleGraph}
                isGraphed={graphedIds.has(col.id)}
              />
            ))}
            <th className="py-2 px-1 w-8">
              <AddColumnButton
                availableToAdd={[MetricType.Effort, MetricType.Distance, MetricType.Resistance]}
                onAddColumn={(type) => alert(`Add: ${type}`)}
              />
            </th>
          </tr>
          <tr className="border-b border-border/50 bg-muted/20">
            {COLUMNS.map(col => (
              <FilterCell
                key={col.id}
                column={col}
                value={filters[col.id] ?? ''}
                onChange={(id, v) => setFilters(f => ({ ...f, [id]: v }))}
              />
            ))}
            <th className="py-1 px-1" />
          </tr>
        </thead>
      </table>
    );
  },
};

/** All key metrics visible at once (graph + sort mix). */
export const AllMetricsVisible: Story = {
  render: () => (
    <table className="border-collapse w-[720px]">
      <thead>
        <tr className="bg-muted/50 border-b border-border">
          {[
            { id: 'action', label: 'Action', type: MetricType.Action as MetricType },
            { id: 'reps', label: 'Reps', type: MetricType.Rep as MetricType },
            { id: 'time', label: 'Time', type: MetricType.Duration as MetricType },
            { id: 'distance', label: 'Distance', type: MetricType.Distance as MetricType },
            { id: 'resistance', label: 'Load', type: MetricType.Resistance as MetricType },
            { id: 'rounds', label: 'Rounds', type: MetricType.Rounds as MetricType },
          ].map((col) => (
            <HeaderCell
              key={col.id}
              column={{
                id: col.id,
                label: col.label,
                source: { type: 'metric-type', metricType: col.type },
                format: { type: 'text' },
                sort: { type: 'numeric', extractor: (c) => (c as any)?.metrics?.[0]?.value ?? 0 },
                filter: { extractor: (c) => String((c as any)?.metrics?.[0]?.value ?? ''), caseInsensitive: true },
                graph: { extractor: (c) => (c as any)?.metrics?.[0]?.value, axisLabel: col.label, unit: '' },
              }}
              sortConfig={col.id === 'reps' ? { columnId: 'reps', direction: 'asc' } : undefined}
              onSort={() => {}}
              onToggleGraph={() => {}}
              isGraphed={col.id === 'time' || col.id === 'distance'}
            />
          ))}
        </tr>
      </thead>
    </table>
  ),
};

/** Error fallback when metric schema cannot be loaded. */
export const ErrorState: Story = {
  render: () => (
    <div className="w-[560px] rounded-md border border-destructive/40 bg-destructive/5 p-3">
      <p className="text-xs text-destructive mb-2">Unable to load metric header schema.</p>
      <table className="border-collapse w-full opacity-70">
        <thead>
          <tr className="bg-muted/40 border-b border-border">
            <HeaderCell column={COLUMNS[0]} sortConfig={undefined} onSort={() => {}} onToggleGraph={() => {}} isGraphed={false} />
            <HeaderCell column={COLUMNS[1]} sortConfig={undefined} onSort={() => {}} onToggleGraph={() => {}} isGraphed={false} />
            <HeaderCell column={COLUMNS[2]} sortConfig={undefined} onSort={() => {}} onToggleGraph={() => {}} isGraphed={false} />
          </tr>
        </thead>
      </table>
    </div>
  ),
};

/** Narrow viewport truncation/overflow behavior. */
export const NarrowViewport: Story = {
  render: () => (
    <div className="w-[240px] overflow-x-auto border border-border rounded">
      <table className="border-collapse min-w-[420px]">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <HeaderCell column={{ ...COLUMNS[0], label: 'Action / Movement Name' }} sortConfig={undefined} onSort={() => {}} onToggleGraph={() => {}} isGraphed={false} />
            <HeaderCell column={{ ...COLUMNS[1], label: 'Repetitions Total' }} sortConfig={{ columnId: 'reps', direction: 'asc' }} onSort={() => {}} onToggleGraph={() => {}} isGraphed={false} />
            <HeaderCell column={{ ...COLUMNS[2], label: 'Elapsed Time (mm:ss)' }} sortConfig={undefined} onSort={() => {}} onToggleGraph={() => {}} isGraphed={false} />
          </tr>
        </thead>
      </table>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};
