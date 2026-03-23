/**
 * Collections Page Stories
 *
 * Full-page shell for the Collections workbench — browse workout templates
 * and open individual entries in a detail view.
 */

import React, { useCallback, useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { CollectionBrowsePanel } from '@/components/collections/CollectionBrowsePanel';
import { NotePreview } from '@/components/workbench/NotePreview';
import { getWodCollections } from '@/repositories/wod-collections';
import type { WodCollection, WodCollectionItem } from '@/repositories/wod-collections';
import type { HistoryEntry } from '@/types/history';
import { EditorShellHeader } from '../../EditorShellHeader';

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

  const handleDownload = useCallback(() => {
    if (!journalState) return;
    const blob = new Blob([journalState.item.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${journalState.item.name.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [journalState]);

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
          <EditorShellHeader
            onBack={() => setJournalState(null)}
            collection={journalState?.collection.name}
            title={journalState?.item.name}
            onDownload={handleDownload}
          />
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
