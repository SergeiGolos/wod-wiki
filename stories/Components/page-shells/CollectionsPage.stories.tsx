/**
 * Collections Page Stories
 *
 * Full-page shell for the Collections workbench — browse workout templates
 * and open individual entries in a detail view.
 */

import React, { useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ArrowLeft } from 'lucide-react';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { CollectionBrowsePanel } from '@/components/collections/CollectionBrowsePanel';
import { NotePreview } from '@/components/workbench/NotePreview';
import { getWodCollections } from '@/repositories/wod-collections';
import type { WodCollection, WodCollectionItem } from '@/repositories/wod-collections';
import type { HistoryEntry } from '@/types/history';

function itemToEntry(item: WodCollectionItem, collection: WodCollection): HistoryEntry {
  return {
    id: `collection:${collection.id}:${item.id}`,
    title: item.name,
    createdAt: 0,
    updatedAt: 0,
    targetDate: 0,
    rawContent: item.content,
    tags: [`collection:${collection.id}`],
    type: 'template',
    notes: '',
    schemaVersion: 1,
  };
}

interface JournalState {
  item: WodCollectionItem;
  collection: WodCollection;
}

const CollectionsPageShell: React.FC = () => {
  const collections = useMemo(() => getWodCollections(), []);
  const [journalState, setJournalState] = useState<JournalState | null>(null);

  const journalEntry = useMemo(
    () => (journalState ? itemToEntry(journalState.item, journalState.collection) : null),
    [journalState],
  );

  const showJournal = journalState !== null;

  return (
    <PanelSizeProvider>
      <div className="relative w-full h-screen overflow-hidden bg-background">
        {/* Browse view */}
        <div
          className="absolute inset-0 transition-all duration-300 ease-in-out"
          style={{
            opacity: showJournal ? 0 : 1,
            transform: showJournal ? 'translateX(-40px)' : 'translateX(0)',
            pointerEvents: showJournal ? 'none' : 'auto',
          }}
        >
          <CollectionBrowsePanel
            collections={collections}
            onSelectItem={(item, collection) => setJournalState({ item, collection })}
            className="h-full"
          />
        </div>

        {/* Journal / detail view */}
        <div
          className="absolute inset-0 flex flex-col transition-all duration-300 ease-in-out"
          style={{
            opacity: showJournal ? 1 : 0,
            transform: showJournal ? 'translateX(0)' : 'translateX(40px)',
            pointerEvents: showJournal ? 'auto' : 'none',
          }}
        >
          <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-border bg-background">
            <button
              type="button"
              onClick={() => setJournalState(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            {journalState && (
              <>
                <span className="text-border">|</span>
                <span className="text-sm font-medium text-foreground truncate">
                  {journalState.item.name}
                </span>
                <span className="ml-auto text-xs text-muted-foreground/60">
                  {journalState.collection.name}
                </span>
              </>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {journalEntry && (
              <NotePreview
                entry={journalEntry}
                onStartWorkout={() => {}}
                onClone={() => {}}
              />
            )}
          </div>
        </div>
      </div>
    </PanelSizeProvider>
  );
};

const meta: Meta = {
  title: 'Pages/Collections',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Full-page collections browser — search, filter, and open workout templates.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => <CollectionsPageShell />,
};
