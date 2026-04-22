/**
 * Catalog / Atoms / GridHeaderCell
 *
 * The sortable column header atoms used in the metric review grid.
 * Three sub-atoms from GridHeader.tsx are showcased here:
 *
 *  HeaderCell     – sortable <th> with icon, label, sort indicator,
 *                   and optional graph-toggle button
 *  FilterCell     – per-column filter <input> inside a <th>
 *  AddColumnButton – ＋ button dropdown for adding metric columns
 *
 * The component is inlined in GridHeader; this story catalogs it
 * in isolation.
 *
 * Stories:
 *  1. HeaderCellVariants  – unsorted / sorted asc / sorted desc / graphed
 *  2. FilterCellVariants  – filterable vs. non-filterable columns
 *  3. AddColumn           – the ＋ button with available metric types
 *  4. FullHeaderRow       – all three atoms composed as a realistic header
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { getMetricIcon } from '@/views/runtime/metricColorMap';
import { MetricType } from '@/core/models/Metric';

// ─── Types (matching GridHeader internals) ────────────────────────────────────

interface GridColumn {
  id: string;
  label: string;
  icon?: React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  graphable?: boolean;
  isGraphed?: boolean;
}

type SortDirection = 'asc' | 'desc';

interface GridSortConfig {
  columnId: string;
  direction: SortDirection;
}

// ─── Atoms (replicated from GridHeader) ──────────────────────────────────────

const SortIndicator: React.FC<{ direction: SortDirection }> = ({ direction }) => (
  <span className="text-primary text-[10px] ml-0.5">
    {direction === 'asc' ? '▲' : '▼'}
  </span>
);

interface HeaderCellProps {
  column: GridColumn;
  sortConfig?: GridSortConfig;
  onSort: (columnId: string, shiftKey: boolean) => void;
  onToggleGraph: (columnId: string) => void;
}

const HeaderCell: React.FC<HeaderCellProps> = ({ column, sortConfig, onSort, onToggleGraph }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (column.sortable) onSort(column.id, e.shiftKey);
  }, [column.id, column.sortable, onSort]);

  const handleGraphClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleGraph(column.id);
  }, [column.id, onToggleGraph]);

  return (
    <th
      className={[
        'py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap select-none',
        column.sortable ? 'cursor-pointer hover:text-foreground transition-colors' : '',
      ].join(' ')}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        {column.icon && <span className="text-sm">{column.icon}</span>}
        <span>{column.label}</span>
        {sortConfig && <SortIndicator direction={sortConfig.direction} />}
        {column.graphable && (
          <button
            className={[
              'ml-auto text-sm opacity-40 hover:opacity-100 transition-opacity',
              column.isGraphed ? 'opacity-100 text-primary' : '',
            ].join(' ')}
            onClick={handleGraphClick}
            title={column.isGraphed ? 'Remove from graph' : 'Add to graph'}
          >
            📊
          </button>
        )}
      </div>
    </th>
  );
};

interface FilterCellProps {
  column: GridColumn;
  value: string;
  onChange: (columnId: string, value: string) => void;
}

const FilterCell: React.FC<FilterCellProps> = ({ column, value, onChange }) => {
  if (!column.filterable) {
    return <th className="py-1 px-2" />;
  }
  return (
    <th className="py-1 px-2">
      <input
        type="text"
        className="w-full px-1.5 py-0.5 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
        placeholder="Filter…"
        value={value}
        onChange={(e) => onChange(column.id, e.target.value)}
      />
    </th>
  );
};

interface AddColumnButtonProps {
  availableToAdd: MetricType[];
  onAddColumn: (type: MetricType) => void;
}

const AddColumnButton: React.FC<AddColumnButtonProps> = ({ availableToAdd, onAddColumn }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!availableToAdd.length) return null;

  return (
    <div ref={ref} className="relative">
      <button
        className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm font-medium"
        onClick={() => setOpen(v => !v)}
        title="Add column"
      >
        ＋
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded shadow-md py-1 min-w-[140px]">
          {availableToAdd.map(type => (
            <button
              key={type}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              onClick={() => { onAddColumn(type); setOpen(false); }}
            >
              <span>{getMetricIcon(type)}</span>
              <span className="capitalize">{type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const Placeholder: React.FC = () => null;

const meta: Meta<typeof Placeholder> = {
  title: 'catalog/molecules/workout/GridHeaderCell',
  component: Placeholder,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Placeholder>;

// ─── Sample columns ───────────────────────────────────────────────────────────

const COLUMNS: GridColumn[] = [
  { id: 'action', label: 'Action', sortable: true, filterable: true },
  { id: 'reps',   label: 'Reps',   sortable: true, filterable: true, graphable: true },
  { id: 'time',   label: 'Time',   sortable: true, filterable: false, graphable: true, isGraphed: true },
  { id: 'notes',  label: 'Notes',  sortable: false, filterable: true },
];

// ─── Stories ──────────────────────────────────────────────────────────────────

/** HeaderCell in all four sort/graph states. */
export const HeaderCellVariants: Story = {
  render: () => (
    <table className="border-collapse">
      <thead>
        <tr className="bg-muted/50 border-b border-border">
          <HeaderCell column={COLUMNS[0]}                            sortConfig={undefined}                           onSort={() => {}} onToggleGraph={() => {}} />
          <HeaderCell column={COLUMNS[1]}                            sortConfig={{ columnId: 'reps', direction: 'asc' }} onSort={() => {}} onToggleGraph={() => {}} />
          <HeaderCell column={COLUMNS[2]}                            sortConfig={{ columnId: 'time', direction: 'desc' }} onSort={() => {}} onToggleGraph={() => {}} />
          <HeaderCell column={{ ...COLUMNS[1], isGraphed: true }}    sortConfig={undefined}                           onSort={() => {}} onToggleGraph={() => {}} />
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
    const [columns, setColumns] = React.useState(COLUMNS);

    const handleSort = (columnId: string) => {
      setSortConfigs(prev => {
        const existing = prev.find(s => s.columnId === columnId);
        if (!existing) return [{ columnId, direction: 'asc' as const }];
        if (existing.direction === 'asc') return [{ columnId, direction: 'desc' as const }];
        return [];
      });
    };

    const handleToggleGraph = (columnId: string) => {
      setColumns(cols => cols.map(c => c.id === columnId ? { ...c, isGraphed: !c.isGraphed } : c));
    };

    return (
      <table className="border-collapse w-[560px]">
        <thead className="bg-muted/50 sticky top-0 z-10">
          <tr className="border-b border-border">
            {columns.map(col => (
              <HeaderCell
                key={col.id}
                column={col}
                sortConfig={sortConfigs.find(s => s.columnId === col.id)}
                onSort={handleSort}
                onToggleGraph={handleToggleGraph}
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
            {columns.map(col => (
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
