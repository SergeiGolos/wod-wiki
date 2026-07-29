import { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderIcon, ChevronRightIcon } from 'lucide-react';
import { v7 as uuidv7 } from 'uuid';
import { getScriptCollection, getScriptCollections, type ScriptCollection, type ScriptCollectionItem } from '@/repositories/script-collections';
import { useCollectionsQueryState } from '../hooks/useCollectionsQueryState';
import { findCanvasPage } from '../canvas/canvasRoutes';
import { CollectionListTemplate } from '../templates/CollectionListTemplate';
import { ListPreludeCanvas } from '../templates/ListPreludeCanvas';
import { detectScriptBlocks } from '@/components/Editor/utils/blockDetection';
import { createJournalNoteFromWorkout } from '../services/journalWorkout';
import { pendingRuntimes } from '../runtimeStore';
import { journalDatePath, runPath, workoutPath } from '../lib/routes';
import { StartHereShelf, type StartHereWorkout } from './StartHereShelf';

const PREFERRED_LOOKUP: Record<string, true> = {
  fran: true,
  cindy: true,
  annie: true,
};
const BENCHMARK_FALLBACK_NAMES = ['Fran', 'Cindy', 'Annie', 'Grace', 'Helen', 'Elizabeth', 'Diane', 'Jackie', 'Karen', 'Nancy', 'Mary', 'Angie', 'Barbara', 'Chelsea', 'Linda', 'Isabel'];

function extractDescription(content: string, name: string): string {
  const match = content.match(/## Description\s*\n+([^#\n]+(?:\n[^#\n]+)*)/i);
  if (match) {
    const paragraph = match[1]
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const firstSentence = paragraph.split(/(?<=[.!?])\s+/)[0];
    return firstSentence || paragraph;
  }

  const lines = content.split('\n');
  let afterTitle = false;
  for (const line of lines) {
    if (line.startsWith('# ')) {
      afterTitle = true;
      continue;
    }
    if (afterTitle && line.trim() && !line.startsWith('---') && !line.startsWith('**')) {
      return line.trim();
    }
  }

  return `${name} benchmark workout`;
}

function selectStartHereWorkouts(): StartHereWorkout[] {
  const collection = getScriptCollection('crossfit-girls');
  const allCollections = getScriptCollections();
  let candidates: ScriptCollectionItem[] = [];
  if (collection) {
    const exact = Object.keys(PREFERRED_LOOKUP)
      .map(id => collection.items.find(item => item.id.toLowerCase() === id))
      .filter((item): item is ScriptCollectionItem => Boolean(item));
    const remaining = collection.items.filter(item => !(PREFERRED_LOOKUP[item.id.toLowerCase()]));
    candidates = [...exact, ...remaining];
  }

  if (candidates.length < 3) {
    const allItems = allCollections.flatMap(c => c.items);
    const fallback = BENCHMARK_FALLBACK_NAMES.flatMap(name => {
      const found = allItems.find(item => item.name.toLowerCase() === name.toLowerCase());
      return found ? [found] : [];
    });
    const seen = new Set(candidates.map(c => c.id));
    candidates = [...candidates, ...fallback.filter(f => !seen.has(f.id))];
  }

  return candidates.slice(0, 3).map(item => {
    const sourceCollection = collection ?? allCollections.find(c => c.items.some(i => i.id === item.id));
    return {
      id: item.id,
      name: item.name,
      description: extractDescription(item.content, item.name),
      category: sourceCollection?.id ?? 'general',
      categoryLabel: sourceCollection?.name ?? 'General',
      content: item.content,
    };
  });
}

function CollectionRow({ collection }: { collection: ScriptCollection }) {
  const hasCategories = collection.categories.length > 0;

  return (
    <div className="w-full flex items-center gap-4 px-6 py-4 text-left group">
      <div className="flex-shrink-0 size-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
        <FolderIcon className="size-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-foreground truncate uppercase tracking-tight">
          {collection.name}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-1">
          <p className="text-xs text-muted-foreground font-medium">
            {collection.count} workout{collection.count !== 1 ? 's' : ''}
          </p>
          {hasCategories ? collection.categories.map(category => (
            <span
              key={category}
              className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary"
            >
              {category.replace(/-/g, ' ')}
            </span>
          )) : (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Other
            </span>
          )}
        </div>
      </div>
      <ChevronRightIcon className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export function CollectionsPage() {
  const { text, selectedCategories } = useCollectionsQueryState();
  const prependedCanvasPage = useMemo(() => findCanvasPage('/collections'), []);
  const query = useMemo(() => ({ text, selectedCategories }), [selectedCategories, text]);
  const navigate = useNavigate();
  const [playingId, setPlayingId] = useState<string | null>(null);

  const startHereWorkouts = useMemo(() => selectStartHereWorkouts(), []);

  const handlePlay = useCallback(async (workout: StartHereWorkout) => {
    const block = detectScriptBlocks(workout.content)[0];
    if (!block) return;

    const runtimeId = uuidv7();
    setPlayingId(workout.id);
    try {
      const journalNote = await createJournalNoteFromWorkout({
        workoutName: workout.name,
        category: workout.category,
        sourceNoteLabel: workout.categoryLabel,
        sourceNotePath: workoutPath(workout.category, workout.id),
        wodContent: block.content,
      });
      pendingRuntimes.set(runtimeId, { block, noteId: journalNote.id });
      navigate(`${journalDatePath(journalNote.journalDate ?? '')}?autoStart=${runtimeId}`);
    } catch {
      pendingRuntimes.set(runtimeId, { block, noteId: `${workout.category}/${workout.id}` });
      navigate(runPath(runtimeId));
    } finally {
      setPlayingId(null);
    }
  }, [navigate]);

  const loadCollections = useMemo(
    () => (currentQuery: typeof query) => {
      let result = getScriptCollections();

      if (currentQuery.selectedCategories.length > 0) {
        result = result.filter(collection =>
          collection.categories.some(category => currentQuery.selectedCategories.includes(category)),
        );
      }

      if (currentQuery.text.trim()) {
        const normalizedQuery = currentQuery.text.toLowerCase();
        result = result.filter(collection =>
          collection.name.toLowerCase().includes(normalizedQuery)
          || collection.id.toLowerCase().includes(normalizedQuery),
        );
      }
      return result;
    },
    [],
  );

  return (
    <CollectionListTemplate
      query={query}
      loadRecords={loadCollections}
      mapRecordToItem={collection => collection}
      getItemKey={collection => collection.id}
      prependedCanvas={
        <>
          {startHereWorkouts.length > 0 && (
            <StartHereShelf
              workouts={startHereWorkouts}
              onPlay={handlePlay}
              isPlaying={playingId}
            />
          )}
          {prependedCanvasPage && <ListPreludeCanvas page={prependedCanvasPage} />}
        </>
      }
      renderPrimaryContent={collection => <CollectionRow collection={collection} />}
      getItemActions={_collection => [
        {
          id: 'open',
          label: 'Open',
          onSelect: item => navigate(`/collections/${encodeURIComponent(item.id)}`),
        },
      ]}
    />
  );
}
