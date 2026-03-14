/**
 * CollectionsView Stories
 *
 * Showcases the Collections browser — the "Library" tab in the app — powered
 * by the real `getWodCollections()` data sourced from the wod/ directory.
 *
 * The layout mirrors `CollectionsPage` exactly:
 *   ┌────────────┬──────────────────┬──────────────────────┐
 *   │  Filter    │  Workout List    │  Preview             │
 *   │  sidebar   │  (ListOfNotes)   │  (NotePreview)       │
 *   └────────────┴──────────────────┴──────────────────────┘
 *
 * Nothing is mocked — collections come from Vite's `import.meta.glob` over
 * the actual wod/ files at build/dev time.
 *
 * States:
 *  1. AllCollections      — no filter, all items listed
 *  2. CrossFitGirls       — "crossfit-girls" collection active
 *  3. KettlebellDanJohn   — "kettlebell-dan-john" sub-collection active
 *  4. KettlebellStrongFirst — "kettlebell-strongfirst" sub-collection active
 *  5. WithPreview         — Fran entry selected, preview panel visible
 *  6. CrossfitGames       — archived CrossFit Games workouts
 */

import React, { useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { CollectionsFilter } from '@/components/history/CollectionsFilter';
import { ListOfNotes } from '@/components/workbench/ListOfNotes';
import { NotePreview } from '@/components/workbench/NotePreview';
import { getWodCollections } from '@/repositories/wod-collections';
import type { WodCollection, WodCollectionItem } from '@/repositories/wod-collections';
import type { HistoryEntry } from '@/types/history';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a WodCollectionItem to a HistoryEntry suitable for ListOfNotes */
function itemToEntry(
  item: WodCollectionItem,
  collectionId: string,
): HistoryEntry {
  return {
    id: `collection:${collectionId}:${item.id}`,
    title: item.name,
    createdAt: 0,
    updatedAt: 0,
    targetDate: 0,
    rawContent: item.content,
    tags: [`collection:${collectionId}`],
    type: 'template',
    notes: '',
    schemaVersion: 1,
  };
}

/**
 * Derive the list of entries to show based on the active collection.
 * Mirrors the logic in CollectionsPage.
 */
function resolveEntries(
  collections: WodCollection[],
  activeCollectionId: string | null,
): HistoryEntry[] {
  if (!activeCollectionId) {
    // Flatten all collections
    return collections.flatMap(col =>
      col.items.map(item => itemToEntry(item, col.id)),
    );
  }
  const col = collections.find(c => c.id === activeCollectionId);
  if (!col) return [];
  return col.items.map(item => itemToEntry(item, col.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// CollectionsViewHarness — the shared story component
// ─────────────────────────────────────────────────────────────────────────────

export interface CollectionsViewHarnessProps {
  /** Initially active collection ID (null = all) */
  initialCollectionId?: string | null;
  /** Initially selected entry ID (null = none, no preview) */
  initialSelectedEntryId?: string | null;
  /** Canvas height */
  height?: string;
  /** Called when user presses "Start Workout" in the preview */
  onStartWorkout?: (blockId: string) => void;
  /** Called when user presses "Clone / Use Template" */
  onClone?: (entryId: string) => void;
}

const CollectionsViewHarness: React.FC<CollectionsViewHarnessProps> = ({
  initialCollectionId = null,
  initialSelectedEntryId = null,
  height = '700px',
  onStartWorkout,
  onClone,
}) => {
  // Real collections data — no mock, straight from wod/ files
  const collections = useMemo(() => getWodCollections(), []);

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    initialCollectionId,
  );
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    initialSelectedEntryId,
  );

  const entries = useMemo(
    () => resolveEntries(collections, activeCollectionId),
    [collections, activeCollectionId],
  );

  const selectedEntry = useMemo(
    () => entries.find(e => e.id === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  );

  const hasPreview = selectedEntry !== null;

  // ── Filter sidebar (left) ────────────────────────────────────────────────
  const filterSidebar = (
    <div className="w-[260px] flex-shrink-0 bg-muted/10 h-full overflow-y-auto flex flex-col p-4 border-r border-border">
      <CollectionsFilter
        collections={collections}
        activeCollectionId={activeCollectionId}
        onCollectionSelect={id => {
          setActiveCollectionId(id);
          setSelectedEntryId(null);
        }}
      />
    </div>
  );

  // ── List panel (centre) ──────────────────────────────────────────────────
  const listPanel = (
    <div className="flex-1 min-w-0 bg-background h-full overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="h-10 flex items-center px-4 border-b border-border gap-2 shrink-0">
        <span className="font-semibold text-sm">
          {activeCollectionId
            ? (() => {
                const col = collections.find(c => c.id === activeCollectionId);
                if (!col) return activeCollectionId;
                if (col.parent) {
                  const parent = collections.find(c => c.id === col.parent);
                  return `${parent?.name ?? col.parent} › ${col.name}`;
                }
                return col.name;
              })()
            : 'All Collections'}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {entries.length} workouts
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ListOfNotes
          entries={entries}
          selectedIds={new Set(selectedEntryId ? [selectedEntryId] : [])}
          onToggleEntry={id => setSelectedEntryId(prev => (prev === id ? null : id))}
          activeEntryId={selectedEntryId}
          enriched={false}
          className="h-full"
        />
      </div>
    </div>
  );

  // ── Preview panel (right, only when entry selected) ──────────────────────
  const previewPanel = hasPreview ? (
    <div
      className="flex-shrink-0 h-full overflow-hidden"
      style={{ width: '420px' }}
    >
      <NotePreview
        entry={selectedEntry}
        onStartWorkout={blockId => onStartWorkout?.(blockId)}
        onClone={() => onClone?.(selectedEntry.id)}
      />
    </div>
  ) : null;

  return (
    <PanelSizeProvider>
      <div
        className="border rounded-lg overflow-hidden bg-background flex"
        style={{ height }}
      >
        {filterSidebar}
        {listPanel}
        {previewPanel}
      </div>
    </PanelSizeProvider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta: Meta<typeof CollectionsViewHarness> = {
  title: 'Components/Collections',
  component: CollectionsViewHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The Collections browser panel — composed from `CollectionsFilter`, ' +
          '`ListOfNotes`, and `NotePreview`. Collection data is loaded directly ' +
          'via `getWodCollections()` which reads the real wod/ file tree at ' +
          'build time through Vite\'s `import.meta.glob`. No mocks.',
      },
    },
  },
  argTypes: {
    initialCollectionId: {
      control: 'text',
      description:
        'Initial active collection ID. null = show all collections. ' +
        'Examples: "crossfit-girls", "kettlebell-dan-john", "crossfit-games"',
    },
    initialSelectedEntryId: {
      control: 'text',
      description:
        'Pre-select an entry by ID to show the preview panel. ' +
        'Format: "collection:{collectionId}:{itemId}"',
    },
    height: {
      control: 'text',
      description: 'CSS height of the story canvas',
    },
  },
  args: {
    onStartWorkout: fn().mockName('onStartWorkout'),
    onClone: fn().mockName('onClone'),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All Collections — the default landing state.
 * Every WOD from every collection is listed; filter sidebar shows all groups.
 */
export const AllCollections: Story = {
  name: 'All Collections',
  args: {
    initialCollectionId: null,
    initialSelectedEntryId: null,
    height: '700px',
  },
};

/**
 * CrossFit Girls — the classic girls benchmark workouts.
 * Filter sidebar is narrowed to "crossfit-girls".
 */
export const CrossFitGirls: Story = {
  name: 'CrossFit Girls',
  args: {
    initialCollectionId: 'crossfit-girls',
    initialSelectedEntryId: null,
    height: '700px',
  },
};

/**
 * CrossFit Girls — Fran entry pre-selected, preview panel visible.
 * This shows the full 3-panel layout in action.
 */
export const CrossFitGirlsWithPreview: Story = {
  name: 'CrossFit Girls — Fran Preview',
  args: {
    initialCollectionId: 'crossfit-girls',
    initialSelectedEntryId: 'collection:crossfit-girls:fran',
    height: '750px',
  },
};

/**
 * Dan John kettlebell sub-collection.
 */
export const KettlebellDanJohn: Story = {
  name: 'Kettlebell: Dan John',
  args: {
    initialCollectionId: 'kettlebell-dan-john',
    initialSelectedEntryId: null,
    height: '700px',
  },
};

/**
 * Dan John — Armor Building Complex entry pre-selected.
 */
export const KettlebellDanJohnWithPreview: Story = {
  name: 'Kettlebell: Dan John — ABC Preview',
  args: {
    initialCollectionId: 'kettlebell-dan-john',
    initialSelectedEntryId: 'collection:kettlebell-dan-john:armor-building-complex',
    height: '750px',
  },
};

/**
 * StrongFirst kettlebell programs.
 */
export const KettlebellStrongFirst: Story = {
  name: 'Kettlebell: StrongFirst',
  args: {
    initialCollectionId: 'kettlebell-strongfirst',
    initialSelectedEntryId: null,
    height: '700px',
  },
};

/**
 * Geoff Neupert — MinMax and other programs.
 */
export const KettlebellGeoffNeupert: Story = {
  name: 'Kettlebell: Geoff Neupert',
  args: {
    initialCollectionId: 'kettlebell-geoff-neupert',
    initialSelectedEntryId: null,
    height: '700px',
  },
};

/**
 * CrossFit Games archived workouts.
 */
export const CrossFitGames: Story = {
  name: 'CrossFit Games (Archive)',
  args: {
    initialCollectionId: 'crossfit-games',
    initialSelectedEntryId: null,
    height: '700px',
  },
};

/**
 * Swimming collections.
 */
export const Swimming: Story = {
  name: 'Swimming',
  args: {
    initialCollectionId: 'swimming-college',
    initialSelectedEntryId: null,
    height: '700px',
  },
};
