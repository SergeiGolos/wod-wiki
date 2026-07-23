import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
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
import { useEditorSave } from '../hooks/useEditorSave';

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
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [reviewSegments, setReviewSegments] = useState<Segment[]>([]);

  const boundariesRef = useRef<NoteBoundary[]>([]);
  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  const handleViewCreated = useCallback((view: EditorView) => {
    setEditorView(view);
    onViewCreated?.(view);
  }, [onViewCreated]);

  // ?note=<uuid> — UI-level sub-selection within the date page. Scrolls the
  // editor to the selected note's first line once both the notes and the
  // editor view are ready (whichever arrives last retriggers the effect).
  const selectedNoteId = searchParams.get('note');
  useEffect(() => {
    if (!selectedNoteId || !notes || !editorView) return;
    const boundary = boundariesRef.current.find(b => b.uuid === selectedNoteId);
    if (!boundary) return;
    const line = Math.min(boundary.startLine + 1, editorView.state.doc.lines);
    const pos = editorView.state.doc.line(line).from;
    editorView.dispatch({
      selection: EditorSelection.cursor(pos),
      effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 96 }),
    });
  }, [selectedNoteId, notes, editorView]);

  useEffect(() => {
    const autoStartId = searchParams.get('autoStart');
    if (!autoStartId) return;
    const pending = pendingRuntimes.get(autoStartId);
    if (pending) {
      pendingRuntimes.delete(autoStartId);
      setTimerBlock(pending.block);
      setActiveRuntimeId(autoStartId);
      setActiveNoteId(pending.noteId);
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
    // AutoStart runs carry their identities from pendingRuntimes: the block
    // id embeds the SOURCE page's doc line, so line-based resolution against
    // this page's doc misses and no result is recorded. Match the journal
    // page's own block by content id (content-stable) and fall back to the
    // pending block itself.
    const isActiveRun = activeNoteId !== null && timerBlock?.id === blockId;
    const runBlock =
      blocks.find(b => b.id === blockId) ??
      (isActiveRun
        ? blocks.find(b => b.contentId && b.contentId === timerBlock!.contentId) ?? timerBlock!
        : undefined);
    if (!runBlock) return;

    const uuid = activeNoteId ?? (() => {
      const match = blockId.match(/^wod-(\d+)-/);
      if (!match) return null;
      return resolveNoteUuid(parseInt(match[1], 10));
    })();
    if (!uuid) return;

    playgroundRecorder.record({
      runBlock,
      blockId,
      noteId: uuid,
      resultId: activeRuntimeId || crypto.randomUUID(),
      data: results!,
      createdAt: results?.endTime || Date.now(),
    }).then((result) => {
      // Surface the new result inline without waiting for a reload.
      setAllResults(prev => [...prev, result]);
      if (results?.logs?.length) {
        const segments = getAnalyticsFromLogs(results.logs).segments;
        setReviewSegments(segments);
        setIsTimerOpen(false);
        setIsReviewOpen(true);
      }
    }).catch(() => {});
    setActiveRuntimeId(null);
    setActiveNoteId(null);
  }, [resolveNoteUuid, blocks, activeRuntimeId, activeNoteId, timerBlock]);

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

  const { onChange: editorSaveOnChange, onLineChange, onBlur } = useEditorSave({
    onSave: save,
    lineIdleMs: 500,
  });

  const onChange = useCallback((value: string) => {
    setContent(value);
    editorSaveOnChange(value);
  }, [editorSaveOnChange]);

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
            onCursorPositionChange={onLineChange}
            onBlur={onBlur}
            noteId={journalDate}
            theme={theme}
            showLineNumbers={false}
            onBlocksChange={setBlocks}
            onCompleteWorkout={handleCompleteWorkout}
            onViewCreated={handleViewCreated}
            extendedResults={allResults}
          />
        )}
      </div>
      {isTimerOpen && timerBlock && (
        <FullscreenTimer
          block={timerBlock}
          onClose={() => {
            setIsTimerOpen(false);
            setActiveRuntimeId(null);
            setActiveNoteId(null);
          }}
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
