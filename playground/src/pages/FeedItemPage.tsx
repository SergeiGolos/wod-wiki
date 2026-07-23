/**
 * FeedItemPage — /feeds/:feedSlug/:feedDate/:feedItem
 *
 * Renders a single feed workout in the JournalPageShell.
 * Content is read-only at source (build-time), but local edits are
 * saved to playgroundContent under `feed/{slug}/{date}/{item}` so scratch
 * edits are preserved across sessions.
 * Action bar exposes:
 *   - Add to Today   → appends the wod block to today's journal
 *   - Plan for date  → appends to a specific date's journal (calendar picker)
 *   - Run Now        → adopts to today's journal + navigates to start timer
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { EditorView } from '@codemirror/view';
import { NoteEditor } from '@/components/organisms/editor/NoteEditor';
import { JournalPageShell } from '@/panels/page-shells';
import type { ScriptBlock } from '@/components/Editor/types';
import { CalendarCard } from '@/components/atoms/CalendarCard';
import { getScriptFeedItem, getScriptFeed } from '@/repositories/script-feeds';
import { usePlaygroundContent } from '../hooks/usePlaygroundContent';
import { createJournalNoteFromWorkout } from '../services/journalWorkout';
import { pendingRuntimes } from '../runtimeStore';
import { journalDatePath, runPath } from '../lib/routes';
import { useNotePageNav } from './shared/useNotePageNav';
import { useScriptBlockCommands } from '../hooks/useScriptBlockCommands';
import { shareBlock, openBlockInPlayground } from '../services/openInPlayground';
import { PageActions } from './shared/PageActions';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/atoms/primitives/toast';
import { localDateKey } from '../views/queriable-list/JournalDateScroll';

export interface FeedItemPageProps {
  feedSlug: string;
  feedDate: string;
  feedItem: string;
  theme: string;
  onViewCreated?: (view: EditorView) => void;
  onScrollToSection?: (id: string) => void;
  onSearch?: () => void;
}

export function FeedItemPage({
  feedSlug,
  feedDate,
  feedItem,
  theme,
  onViewCreated,
  onScrollToSection,
  onSearch,
}: FeedItemPageProps) {
  const navigate = useNavigate();

  const item = getScriptFeedItem(feedSlug, feedDate, feedItem);
  const feed = getScriptFeed(feedSlug);
  const playgroundCategory = `feed/${feedSlug}/${feedDate}`;
  // Store local edits under a deterministic key in playgroundContent.
  // The feed item's canonical content is the mdContent fallback.
  const { content, onChange, onLineChange, onBlur } = usePlaygroundContent({
    category: playgroundCategory,
    name: feedItem,
    mdContent: item?.content ?? `# ${feedItem}\n\n*Feed item not found.*\n`,
  });

  const [scriptBlocks, setScriptBlocks] = useState<ScriptBlock[]>([]);
  const noteId = `feed/${feedSlug}/${feedDate}/${feedItem}`;

  const handleStartWorkout = useCallback(
    async (block: ScriptBlock) => {
      try {
        const runtimeId = uuidv4();
        const journalNote = await createJournalNoteFromWorkout({
          workoutName: item?.name ?? feedItem,
          category: feedSlug,
          sourceNoteLabel: feed?.name,
          sourceNotePath: `/feeds/${encodeURIComponent(feedSlug)}`,
          wodContent: block.content,
        });
        pendingRuntimes.set(runtimeId, { block, noteId: journalNote.id });
        navigate(`${journalDatePath(journalNote.journalDate ?? '')}?autoStart=${runtimeId}`);
      } catch {
        const runtimeId = uuidv4();
        pendingRuntimes.set(runtimeId, { block, noteId });
        navigate(runPath(runtimeId));
      }
    },
    [feed, feedItem, feedSlug, item, navigate, noteId],
  );

  const handleAddToToday = useCallback(async (block: ScriptBlock) => {
    try {
      const journalNote = await createJournalNoteFromWorkout({
        workoutName: item?.name ?? feedItem,
        category: feedSlug,
        sourceNoteLabel: feed?.name,
        sourceNotePath: `/feeds/${encodeURIComponent(feedSlug)}`,
        wodContent: block.content,
      });
      const today = localDateKey(new Date());
      toast({
        title: 'Added to journal',
        description: journalNote.journalDate === today ? `Added to today's journal` : `Added to ${journalNote.journalDate}`,
        action: (
          <ToastAction altText="Open journal" onClick={() => navigate(journalNotePath(journalNote.journalDate ?? '', journalNote.id))}>
            Open
          </ToastAction>
        ),
      });
    } catch {
      toast({ title: 'Error', description: 'Could not add to journal', variant: 'destructive' });
    }
  }, [feed, feedItem, feedSlug, item, navigate]);

  const [pendingScheduleBlock, setPendingScheduleBlock] = useState<ScriptBlock | null>(null);

  const handleScheduleBlock = useCallback(async (block: ScriptBlock, date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    try {
      await createJournalNoteFromWorkout({
        workoutName: item?.name ?? feedItem,
        category: feedSlug,
        sourceNoteLabel: feed?.name,
        sourceNotePath: `/feeds/${encodeURIComponent(feedSlug)}`,
        wodContent: block.content,
        date: date,
      });
      toast({
        title: 'Scheduled',
        description: `Added to journal for ${dateKey}`,
        action: (
          <ToastAction altText="Open journal" onClick={() => navigate(`/journal/${dateKey}`)}>
            Open
          </ToastAction>
        ),
      });
    } catch {
      toast({ title: 'Error', description: 'Could not schedule workout', variant: 'destructive' });
    }
  }, [feed, feedItem, feedSlug, item, navigate]);

  const index = useNotePageNav({
    content,
    scriptBlocks,
    onStartWorkout: handleStartWorkout,
  });

  const commands = useScriptBlockCommands('collection-readonly', {
    onPlay: handleStartWorkout,
    onShare: shareBlock,
    onAddToToday: handleAddToToday,
    onSchedule: setPendingScheduleBlock,
    onOpenInPlayground: (block) => openBlockInPlayground(block, navigate),
  });

  return (
    <>
      <JournalPageShell
        title={item?.name ?? feedItem}
        index={index}
        onScrollToSection={onScrollToSection}
        actions={
          <PageActions
            mode="collection-readonly"
            currentWorkout={{ name: item?.name ?? feedItem, content }}
            index={index}
            onSearch={onSearch ?? (() => {})}
          />
        }
        editor={
          <NoteEditor
            value={content}
            onChange={onChange}
            onCursorPositionChange={onLineChange}
            onBlur={onBlur}
            noteId={noteId}
            commands={commands}
            enableInlineRuntime={false}
            onViewCreated={onViewCreated}
            theme={theme}
            showLineNumbers={false}
            onBlocksChange={setScriptBlocks}
          />
        }
      />
      {pendingScheduleBlock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPendingScheduleBlock(null)}
        >
          <div
            className="bg-card border border-border rounded-xl p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold mb-4 text-foreground">
              Schedule for&hellip;
            </p>
            <CalendarCard
              selectedDate={null}
              onDateSelect={(date) => {
                handleScheduleBlock(pendingScheduleBlock, date)
                setPendingScheduleBlock(null)
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
