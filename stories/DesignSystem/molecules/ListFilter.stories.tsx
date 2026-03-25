/**
 * DesignSystem / Molecules / ListFilter
 *
 * Sidebar filter panel — calendar, notebooks, collections, and bulk-select controls.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ListFilter } from '@/components/workbench/ListFilter';
import {
  FIXTURE_ENTRY_DATES,
  FIXTURE_NOTEBOOKS,
  FIXTURE_COLLECTIONS,
} from '../fixtures';

const meta: Meta<typeof ListFilter> = {
  title: 'DesignSystem/Molecules/ListFilter',
  component: ListFilter,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-72 p-4 bg-background rounded-lg border border-border shadow-sm h-[85vh] overflow-auto">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const Controlled: React.FC<{
  initialDate?: Date;
  initialNotebook?: string | null;
  initialCollection?: string | null;
  withSelectedIds?: boolean;
  compact?: boolean;
}> = ({
  initialDate = new Date(),
  initialNotebook = null,
  initialCollection = null,
  withSelectedIds = false,
  compact = false,
}) => {
  const [calDate, setCalDate] = useState(initialDate);
  const [notebook, setNotebook] = useState<string | null>(initialNotebook);
  const [collection, setCollection] = useState<string | null>(initialCollection);
  const selectedIds = withSelectedIds ? new Set(['entry-fran', 'entry-cindy']) : undefined;

  return (
    <ListFilter
      calendarDate={calDate}
      onCalendarDateChange={setCalDate}
      entryDates={FIXTURE_ENTRY_DATES}
      notebooks={FIXTURE_NOTEBOOKS}
      activeNotebookId={notebook}
      onNotebookSelect={setNotebook}
      collections={FIXTURE_COLLECTIONS}
      activeCollectionId={collection}
      onCollectionSelect={setCollection}
      onResetFilters={() => {
        setNotebook(null);
        setCollection(null);
      }}
      compact={compact}
      selectedIds={selectedIds}
      onSelectAll={() => alert('Select all')}
      onClearSelection={() => alert('Clear selection')}
    />
  );
};

export const Default: Story = {
  name: 'Default — all sections visible',
  render: () => <Controlled />,
};

export const NotebookSelected: Story = {
  name: 'Active notebook filter',
  render: () => <Controlled initialNotebook="nb-benchmarks" />,
};

export const CollectionSelected: Story = {
  name: 'Active collection filter',
  render: () => <Controlled initialCollection="crossfit-benchmarks" />,
};

export const WithBulkSelection: Story = {
  name: 'Bulk-selection actions visible (2 entries selected)',
  render: () => <Controlled withSelectedIds />,
};

export const CompactMode: Story = {
  name: 'Compact mode (mobile/narrow)',
  render: () => <Controlled compact />,
};
