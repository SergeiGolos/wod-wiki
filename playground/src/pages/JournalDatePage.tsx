import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { EditorView } from '@codemirror/view';
import { Decoration, MatchDecorator, WidgetType, ViewPlugin } from '@codemirror/view';
import { NoteEditor } from '@/components/organisms/editor/NoteEditor';
import type { ScriptBlock } from '@/components/Editor/types';
import { playgroundRecorder } from '../services/resultRecorder';
import type { HistoryEntry } from '@/types/history';
import { journalNotes } from '../services/journalNotes';
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

const journalContentProvider = new IndexedDBContentProvider();

interface JournalDatePageProps {
  journalDate: string;
  theme: string;
  onViewCreated?: (view: EditorView) => void;
}

const MARKER_REGEX = /^<!-- uuid:([0-9a-fA-F-]+) -->\n?/gm;

class BoundaryWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr');
    hr.className = 'my-8 border-t-2 border-dashed border-border/50';
    return hr;
  }
}

const boundaryDecorator = new MatchDecorator({
  regexp: MARKER_REGEX,
  decoration: Decoration.replace({
    widget: new BoundaryWidget(),
    block: true,
    inclusive: false,
  }),
});

const boundaryExtension = ViewPlugin.fromClass(
  class {
    decorations;
    constructor(view: EditorView) {
      this.decorations = boundaryDecorator.createDeco(view);
    }
    update(update: import('@codemirror/view').ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = boundaryDecorator.updateDeco(update, this.decorations);
      }
    }
  },
  { decorations: v => v.decorations }
);

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

  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const timeoutRef = useRef<number | undefined>(undefined);
  const initialLoadRef = useRef(false);


  const handleCompleteWorkout = useCallback((blockId: string, results: ScriptBlock["results"]) => {
    const match = blockId.match(/^wod-(\d+)-/);
    if (!match) return;
    const startLine = parseInt(match[1], 10);
    const lines = content.split('\n').slice(0, startLine);
    let uuid = journalDate;
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(/^<!-- uuid:([0-9a-fA-F-]+) -->/);
      if (m) {
        uuid = m[1];
        break;
      }
    }
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
  }, [content, blocks, journalDate, activeRuntimeId]);

  useEffect(() => {
    let cancelled = false;
    journalNotes.listByDate(journalDate).then(async (entries) => {
      if (cancelled) return;
      setNotes(entries);
      const stitched = entries.map(n => `<!-- uuid:${n.id} -->\n${n.rawContent.trim()}`).join('\n\n');
      setContent(stitched);
      const resultsArrays = await Promise.all(entries.map(n => indexedDBService.getResultsForNote(n.id)));
      if (!cancelled) setAllResults(resultsArrays.flat());
      initialLoadRef.current = true;
    }).catch(() => {
      if (!cancelled) setNotes([]);
    });
    return () => { cancelled = true; };
  }, [journalDate]);

  const save = useCallback((value: string) => {
    if (!notes) return;
    const parts = value.split(/^<!-- uuid:([0-9a-fA-F-]+) -->\n?/gm);
    // parts[0] is text before first marker (usually empty)
    // parts[1] is uuid1, parts[2] is content1, parts[3] is uuid2, parts[4] is content2...
    for (let i = 1; i < parts.length; i += 2) {
      const uuid = parts[i];
      const noteContent = parts[i + 1] || '';
      journalNotes.update(uuid, noteContent.trim()).catch(() => {});
    }
  }, [notes]);

  const onChange = useCallback((value: string) => {
    setContent(value);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => save(value), 500);
  }, [save]);

  useEffect(() => () => {
    clearTimeout(timeoutRef.current);
    save(content);
  }, [content, save]);

  const extensions = useMemo(() => [boundaryExtension], []);

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
            extensions={extensions}
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
