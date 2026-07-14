import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import type { ScriptBlock } from '@/components/Editor/types';
import type { HistoryEntry } from '@/types/history';
import { journalNotes } from '../services/journalNotes';
import { playgroundRecorder } from '../services/resultRecorder';
import { FullscreenTimer } from '@/components/organisms/review/FullscreenTimer';
import { FullscreenReview } from '@/components/organisms/review/FullscreenReview';
import { useSearchParams } from 'react-router-dom';
import { pendingRuntimes } from '../runtimeStore';
import type { Segment } from '@/core/models/AnalyticsModels';
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer';
import { WorkbenchSessionProvider } from '@/stores/workbenchSessionStore';
import { notePersistence } from '@/services/persistence';
import { indexedDBService } from '@/services/db/IndexedDBService';
import type { WorkoutResult } from '@/types/storage';
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import { NoteEditor } from '@/components/organisms/editor/NoteEditor';

const journalContentProvider = new IndexedDBContentProvider();

interface JournalDatePageProps {
  journalDate: string;
  theme: string;
  onViewCreated?: (view: EditorView) => void;
}

interface NoteBoundary {
  uuid: string;
  startLine: number; // 0-indexed
}

export function JournalDatePage({ journalDate, theme, onViewCreated }: JournalDatePageProps) {
  const [notes, setNotes] = useState<HistoryEntry[] | null>(null);
  const [content, setContent] = useState<string>('');
  const [allResults, setAllResults] = useState<WorkoutResult[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [timerBlock, setTimerBlock] = useState<ScriptBlock | null>(null);
  const [activeRuntimeId, setActiveRuntimeId] = useState<string | null>(null);
  const [reviewSegments, setReviewSegments] = useState<Segment[]>([]);

  const boundariesRef = useRef<NoteBoundary[]>([]);
  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const autoStartId = searchParams.get('autoStart');
    if (!autoStartId) return;
    const pending = pendingRuntimes.get(autoStartId);
    if (pending) {
      pendingRuntimes.delete(autoStartId);
      setTimerBlock(pending.block);
      setActiveRuntimeId(autoStartId);
      setIsTimerOpen(true);
    }
    setSearchParams((prev) => {
      prev.delete('autoStart');
      return prev;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCloseReview = useCallback(() => setIsReviewOpen(false), []);

  const resolveNoteUuid = useCallback((startLine: number): string => {
    const boundaries = boundariesRef.current;
    let uuid = boundaries[0]?.uuid ?? journalDate;
    for (const b of boundaries) {
      if (b.startLine <= startLine) uuid = b.uuid;
      else break;
    }
    return uuid;
  }, [journalDate]);

  const handleCompleteWorkout = useCallback((blockId: string, results: ScriptBlock["results"]) => {
    const match = blockId.match(/^wod-(\d+)-/);
    if (!match) return;
    const startLine = parseInt(match[1], 10);
    const uuid = resolveNoteUuid(startLine);
    const runBlock = blocks.find(b => b.id === blockId);
    if (!runBlock) return;

    playgroundRecorder.record({
      runBlock,
      blockId,
      noteId: uuid,
      resultId: activeRuntimeId || crypto.randomUUID(),
      data: results!,
      completedAt: results?.endTime || Date.now(),
    }).then(() => {
      if (results?.logs) {
        const segments = getAnalyticsFromLogs(results.logs).segments;
        setReviewSegments(segments);
        setIsTimerOpen(false);
        setIsReviewOpen(true);
      }
    }).catch(() => {});
    setActiveRuntimeId(null);
  }, [resolveNoteUuid, blocks, activeRuntimeId]);

  useEffect(() => {
    let cancelled = false;
    journalNotes.listByDate(journalDate).then(async (entries) => {
      if (cancelled) return;
      setNotes(entries);

      const pieces: string[] = [];
      const boundaries: NoteBoundary[] = [];
      let currentLine = 0;
      for (const entry of entries) {
        const trimmed = entry.rawContent.trim();
        if (currentLine > 0) {
          pieces.push('');
          currentLine += 1;
        }
        boundaries.push({ uuid: entry.id, startLine: currentLine });
        const lineCount = trimmed.split('\n').length;
        pieces.push(trimmed);
        currentLine += lineCount;
      }
      boundariesRef.current = boundaries;
      setContent(pieces.join('\n'));

      const resultsArrays = await Promise.all(entries.map(n => indexedDBService.getResultsForNote(n.id)));
      if (!cancelled) setAllResults(resultsArrays.flat());
    }).catch(() => {
      if (!cancelled) setNotes([]);
    });
    return () => { cancelled = true; };
  }, [journalDate]);

  const save = useCallback((value: string) => {
    const boundaries = boundariesRef.current;
    if (!boundaries.length) return;
    const lines = value.split('\n');
    for (let i = 0; i < boundaries.length; i++) {
      const start = boundaries[i].startLine;
      const end = i + 1 < boundaries.length ? boundaries[i + 1].startLine - 1 : lines.length;
      const noteContent = lines.slice(start, end).join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
      journalNotes.update(boundaries[i].uuid, noteContent).catch(() => {});
    }
  }, []);

  const onChange = useCallback((value: string) => {
    setContent(value);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => save(value), 500);
  }, [save]);

  useEffect(() => () => {
    clearTimeout(timeoutRef.current);
    save(content);
  }, [content, save]);

  if (!notes) return <div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>;

  return (
    <WorkbenchSessionProvider notePersistence={notePersistence} provider={journalContentProvider}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
        <header>
          <h1 className="text-2xl font-semibold">{journalDate}</h1>
          <p className="text-sm text-muted-foreground">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
        </header>
        {notes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No Notes on this date yet.</p>
        ) : (
          <NoteEditor
            value={content}
            onChange={onChange}
            noteId={journalDate}
            theme={theme}
            showLineNumbers={false}
            onBlocksChange={setBlocks}
            onCompleteWorkout={handleCompleteWorkout}
            onViewCreated={onViewCreated}
            extendedResults={allResults}
          />
        )}
      </div>
      {isTimerOpen && timerBlock && (
        <FullscreenTimer
          block={timerBlock}
          onClose={() => setIsTimerOpen(false)}
          onCompleteWorkout={handleCompleteWorkout}
          autoStart
        />
      )}
      {isReviewOpen && reviewSegments.length > 0 && (
        <FullscreenReview
          segments={reviewSegments}
          onClose={handleCloseReview}
          title="Workout Review"
        />
      )}
    </WorkbenchSessionProvider>
  );
}
