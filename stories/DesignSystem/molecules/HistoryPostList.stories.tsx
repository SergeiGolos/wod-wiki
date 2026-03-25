/**
 * DesignSystem / Molecules / HistoryPostList
 *
 * Scrollable list of workout history entries with selection, cloning, and editing.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HistoryPostList } from '@/components/history/HistoryPostList';
import { FIXTURE_ENTRIES } from '../fixtures';

const meta: Meta<typeof HistoryPostList> = {
  title: 'DesignSystem/Molecules/HistoryPostList',
  component: HistoryPostList,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto border border-border rounded-lg overflow-hidden bg-background">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const Controlled: React.FC<{
  entries?: typeof FIXTURE_ENTRIES;
  initialSelectedIds?: Set<string>;
  activeEntryId?: string | null;
  enriched?: boolean;
}> = ({
  entries = FIXTURE_ENTRIES,
  initialSelectedIds = new Set<string>(),
  activeEntryId = null,
  enriched = false,
}) => {
  const [selected, setSelected] = useState(initialSelectedIds);
  return (
    <HistoryPostList
      entries={entries}
      selectedIds={selected}
      onToggle={(id) =>
        setSelected(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        })
      }
      activeEntryId={activeEntryId}
      enriched={enriched}
      onEdit={(id) => alert(`Edit: ${id}`)}
      onClone={(id, ts) => alert(`Clone ${id} → ${ts ? new Date(ts).toLocaleDateString() : 'today'}`)}
    />
  );
};

export const Default: Story = {
  name: 'All entries (no selection)',
  render: () => <Controlled />,
};

export const WithSelection: Story = {
  name: 'With one entry selected',
  render: () => <Controlled initialSelectedIds={new Set(['entry-fran'])} />,
};

export const ActiveEntry: Story = {
  name: 'Active / open entry highlighted',
  render: () => <Controlled activeEntryId="entry-cindy" />,
};

export const EnrichedMode: Story = {
  name: 'Enriched mode (shows tags & metadata)',
  render: () => <Controlled enriched />,
};

export const WithTemplate: Story = {
  name: 'Contains template entry (clone button)',
  render: () => {
    const templateEntries = FIXTURE_ENTRIES.filter(e => e.type === 'template');
    const noteEntries = FIXTURE_ENTRIES.filter(e => e.type !== 'template');
    return <Controlled entries={[...templateEntries, ...noteEntries]} />;
  },
};

export const EmptyList: Story = {
  name: 'Empty list (no entries)',
  render: () => <Controlled entries={[]} />,
};
