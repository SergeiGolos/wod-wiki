/**
 * DesignSystem / Molecules / ListOfNotes
 *
 * Scrollable list of history entries (thin wrapper over HistoryPostList).
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ListOfNotes } from '@/components/workbench/ListOfNotes';
import { FIXTURE_ENTRIES } from '../fixtures';

const meta: Meta<typeof ListOfNotes> = {
  title: 'DesignSystem/Molecules/ListOfNotes',
  component: ListOfNotes,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto h-[500px] border border-border rounded-lg overflow-auto bg-background">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const Controlled: React.FC<{
  entries?: typeof FIXTURE_ENTRIES;
  activeEntryId?: string | null;
  enriched?: boolean;
}> = ({ entries = FIXTURE_ENTRIES, activeEntryId = null, enriched = false }) => {
  const [selected, setSelected] = useState(new Set<string>());
  return (
    <ListOfNotes
      entries={entries}
      selectedIds={selected}
      onToggleEntry={(id) =>
        setSelected(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        })
      }
      activeEntryId={activeEntryId}
      enriched={enriched}
      onEdit={(id) => alert(`Edit: ${id}`)}
      onClone={(id) => alert(`Clone: ${id}`)}
    />
  );
};

export const Default: Story = {
  name: 'Default — all entries',
  render: () => <Controlled />,
};

export const WithActiveEntry: Story = {
  name: 'With active entry highlighted',
  render: () => <Controlled activeEntryId="entry-fran" />,
};

export const EnrichedMode: Story = {
  name: 'Enriched mode (tags visible)',
  render: () => <Controlled enriched />,
};

export const EmptyList: Story = {
  name: 'Empty list',
  render: () => <Controlled entries={[]} />,
};
