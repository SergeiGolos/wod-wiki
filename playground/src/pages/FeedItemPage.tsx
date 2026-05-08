/**
 * FeedItemPage — /feeds/:feedSlug/:feedDate/:feedItem
 *
 * Renders a single feed workout in the JournalPageShell.
 * Content is read-only at source (build-time), but local edits are
 * saved to playgroundDB under `feed/{slug}/{date}/{item}` so scratch
 * edits are preserved across sessions.
 *
 * Action bar exposes:
 *   - Add to Today   → appends the wod block to today's journal
 *   - Plan for date  → appends to a specific date's journal (calendar picker)
 *   - Run Now        → adopts to today's journal + navigates to start timer
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { EditorView } from '@codemirror/view';
import { PlusIcon, PlayIcon } from 'lucide-react';
import { NoteEditor } from '@/components/Editor/NoteEditor';
import { JournalPageShell } from '@/panels/page-shells';
import type { WodBlock } from '@/components/Editor/types';
import { getWodFeedItem, getWodFeed } from '@/repositories/wod-feeds';
import { usePlaygroundContent } from '../hooks/usePlaygroundContent';
import { appendWorkoutToJournal } from '../services/journalWorkout';
import { pendingRuntimes } from '../runtimeStore';
import { useNotePageNav } from './shared/useNotePageNav';
import { CastButtonRpc } from '@/components/cast/CastButtonRpc';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { localDateKey } from '../views/queriable-list/JournalDateScroll';

export interface FeedItemPageProps {
  feedSlug: string;
  feedDate: string;
  feedItem: string;
  theme: string;
  onViewCreated?: (view: EditorView) => void;
  onScrollToSection?: (id: string) => void;
}

export function FeedItemPage({
  feedSlug,
  feedDate,
  feedItem,
  theme,
  onViewCreated,
  onScrollToSection,
}: FeedItemPageProps) {
  const navigate = useNavigate();

  const item = getWodFeedItem(feedSlug, feedDate, feedItem);
  const feed = getWodFeed(feedSlug);

  // Store local edits under a deterministic key in playgroundDB.
  // The feed item's canonical content is the mdContent fallback.
  const playgroundCategory = `feed/${feedSlug}/${feedDate}`;
  const { content, onChange, onLineChange, onBlur } = usePlaygroundContent({
    category: playgroundCategory,
    name: feedItem,
    mdContent: item?.content ?? `# ${feedItem}\n\n*Feed item not found.*\n`,
  });

  const [wodBlocks, setWodBlocks] = useState<WodBlock[]>([]);
  const noteId = `feed/${feedSlug}/${feedDate}/${feedItem}`;

  const handleStartWorkout = useCallback(
    async (block: WodBlock) => {
      try {
        const runtimeId = uuidv4();
        const journalNoteId = await appendWorkoutToJournal({
          workoutName: item?.name ?? feedItem,
          category: feedSlug,
          sourceNoteLabel: feed?.name,
          sourceNotePath: `/feeds/${encodeURIComponent(feedSlug)}`,
          wodContent: block.content,
        });
        pendingRuntimes.set(runtimeId, { block, noteId: journalNoteId });
        const dateKey = journalNoteId.replace('journal/', '');
        navigate(`/journal/${dateKey}?autoStart=${runtimeId}`);
      } catch {
        const runtimeId = uuidv4();
        pendingRuntimes.set(runtimeId, { block, noteId });
        navigate(`/tracker/${runtimeId}`);
      }
    },
    [feed, feedItem, feedSlug, item, navigate, noteId],
  );

  const handleAddToToday = useCallback(async () => {
    try {
      const journalNoteId = await appendWorkoutToJournal({
        workoutName: item?.name ?? feedItem,
        category: feedSlug,
        sourceNoteLabel: feed?.name,
        sourceNotePath: `/feeds/${encodeURIComponent(feedSlug)}`,
        wodContent: content,
        wrapInWod: false,
      });
      const dateKey = journalNoteId.replace('journal/', '');
      const today = localDateKey(new Date());
      toast({
        title: 'Added to journal',
        description: dateKey === today
          ? `Added to today's journal`
          : `Added to ${dateKey}`,
        action: (
          <ToastAction altText="Open journal" onClick={() => navigate(`/journal/${dateKey}`)}>
            Open
          </ToastAction>
        ),
      });
    } catch {
      toast({ title: 'Error', description: 'Could not add to journal', variant: 'destructive' });
    }
  }, [content, feed, feedItem, feedSlug, item, navigate]);

  const index = useNotePageNav({
    content,
    wodBlocks,
    onStartWorkout: handleStartWorkout,
  });

  const actions = (
    <div className="flex items-center gap-2">
      <button
        onClick={handleAddToToday}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
      >
        <PlusIcon className="size-3.5" />
        Add to Today
      </button>
      {wodBlocks.length > 0 && (
        <button
          onClick={() => wodBlocks[0] && handleStartWorkout(wodBlocks[0])}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PlayIcon className="size-3.5" />
          Run Now
        </button>
      )}
      <CastButtonRpc />
    </div>
  );

  return (
    <JournalPageShell
      title={item?.name ?? feedItem}
      index={index}
      onScrollToSection={onScrollToSection}
      actions={actions}
      editor={
        <NoteEditor
          value={content}
          onChange={onChange}
          onCursorPositionChange={onLineChange}
          onBlur={onBlur}
          noteId={noteId}
          onStartWorkout={handleStartWorkout}
          enableInlineRuntime={false}
          onViewCreated={onViewCreated}
          theme={theme}
          showLineNumbers={false}
          onBlocksChange={setWodBlocks}
        />
      }
    />
  );
}
