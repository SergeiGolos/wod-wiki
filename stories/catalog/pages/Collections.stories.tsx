/**
 * Collections Page Stories
 *
 * Full-page shell for the Collections workbench — browse workout templates
 * and open individual entries in a detail view.
 */

import React, { useCallback, useState, useMemo, type FC } from 'react';
import { CollectionsPage } from '../../../playground/src/views/CollectionsPage';
import type { Meta, StoryObj } from '@storybook/react';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { CollectionBrowsePanel } from '@/components/collections/CollectionBrowsePanel';
import { NoteEditor } from '@/components/Editor/NoteEditor';
import { CommandProvider } from '@/components/command-palette/CommandContext';
import { getWodCollections } from '@/repositories/wod-collections';
import type { WodCollection, WodCollectionItem } from '@/repositories/wod-collections';
import { EditorShellHeader } from '../../_shared/EditorShellHeader';
import { useTheme } from '@/components/theme/ThemeProvider';

interface JournalState {
  item: WodCollectionItem;
  collection: WodCollection;
}

const CollectionsPageShell: React.FC = () => {
  const collections = useMemo(() => getWodCollections(), []);
  const [journalState, setJournalState] = useState<JournalState | null>(null);
  const [content, setContent] = useState('');
  const { theme } = useTheme();
  const editorTheme = theme === 'dark' ? 'dark' : 'vs';

  const showJournal = journalState !== null;

  const handleSelectItem = (item: WodCollectionItem, collection: WodCollection) => {
    setContent(item.content);
    setJournalState({ item, collection });
  };

  const handleBack = () => setJournalState(null);

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
            onSelectItem={handleSelectItem}
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
            onBack={handleBack}
            collection={journalState?.collection.name}
            title={journalState?.item.name}
            onDownload={handleDownload}
          />
          <div className="flex-1 min-h-0 overflow-y-scroll">
            <CommandProvider>
              <NoteEditor
                value={content}
                onChange={setContent}
                onStartWorkout={() => {}}
                className="h-full w-full"
                theme={editorTheme}
              />
            </CommandProvider>
          </div>
        </div>
      </div>
    </PanelSizeProvider>
  );
};

const meta: Meta = {
  title: 'catalog/pages/Collections',
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
  name: 'WorkbenchCollections',
  render: () => <CollectionsPageShell />,
};

// ── Playground view (real routing-aware CollectionsPage) ─────────────────────

const PlaygroundCollectionsShell: FC = () => (
  <div className="w-full h-screen bg-background overflow-hidden">
    <CollectionsPage />
  </div>
)

export const PlaygroundCollections: StoryObj = {
  name: 'PlaygroundCollections',
  render: () => <PlaygroundCollectionsShell />,
}
