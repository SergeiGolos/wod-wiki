/**
 * DesignSystem / Molecules / NotePreview
 *
 * Preview panel for a workout note. Supports two modes:
 *  - Entry mode: renders the full markdown content via NoteEditor (read-only)
 *  - Items mode: renders a list of DocumentItems as clickable cards
 */


import type { Meta, StoryObj } from '@storybook/react';
import { NotePreview } from '@/components/workbench/NotePreview';
import { FIXTURE_ENTRIES } from '../fixtures';

const meta: Meta<typeof NotePreview> = {
  title: 'DesignSystem/Molecules/NotePreview',
  component: NotePreview,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto h-[600px] border border-border rounded-lg overflow-auto bg-background">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const EntryModeFran: Story = {
  name: 'Entry mode — Fran (note)',
  args: {
    entry: FIXTURE_ENTRIES[0],
    onEdit: () => alert('Edit'),
    onClone: () => alert('Clone'),
  },
};

export const EntryModeCindy: Story = {
  name: 'Entry mode — Cindy (AMRAP)',
  args: {
    entry: FIXTURE_ENTRIES[1],
    onEdit: () => alert('Edit'),
    onClone: () => alert('Clone'),
  },
};

export const EntryModeTemplate: Story = {
  name: 'Entry mode — Helen (template type)',
  args: {
    entry: FIXTURE_ENTRIES[3],
    onEdit: () => alert('Edit template'),
    onClone: (date?: number) =>
      alert(`Add to plan on: ${date ? new Date(date).toLocaleDateString() : 'today'}`),
  },
};

export const EmptyEntry: Story = {
  name: 'No entry (empty state)',
  args: {
    entry: undefined,
    title: 'Select an entry to preview',
  },
};
