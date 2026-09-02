import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import type { ScriptBlock } from '@/components/Editor/types';
import type { HistoryEntry } from '@/types/history';
import { journalNotes } from '../services/journalNotes';
import { playgroundRecorder } from '@/services/resultRecorder';
import { FullscreenTimer } from '@/components/organisms/review/FullscreenTimer';
import { useSearchParams } from 'react-router-dom';
import { pendingRuntimes } from '../runtimeStore';
import { WorkbenchSessionProvider } from '@/stores/workbenchSessionStore';
import { notePersistence } from '@/services/persistence';
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import { NoteEditor } from '@/components/organisms/editor/NoteEditor';
import { sessionQueryInsert, sessionQueryWql } from '@bitcobblers/wod-wiki-ui/extensions';
import { resolveCompletionTargets } from '../lib/workoutCompletion';
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
  const [viewMode, setViewMode] = useState<'read' | 'edit'>('read');
  const [content, setContent] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerBlock, setTimerBlock] = useState<ScriptBlock | null>(null);
  const [activeRuntimeId, setActiveRuntimeId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const boundariesRef = useRef<NoteBoundary[]>([]);
  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const editorViewRef = useRef<EditorView | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const handleViewCreated = useCallback((view: EditorView) => {
    editorViewRef.current = view;
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
    editorView.focus();
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

  const resolveNoteUuid = useCallback((startLine: number): string => {
    const boundaries = boundariesRef.current;
    let uuid = boundaries[0]?.uuid ?? journalDate;
    for (const b of boundaries) {
      if (b.startLine <= startLine) uuid = b.uuid;
      else break;
    }
    return uuid;
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

  const handleCompleteWorkout = useCallback((blockId: string, results: ScriptBlock["results"], editorResultId?: string, editorRunBlock?: Pick<ScriptBlock, "id" | "contentId">) => {
    // Map the completed run back to its block + note + result id in one place
    // (see workoutCompletion.ts): the result MUST record under the same id the
    // query:table references, or the inline table renders empty.
    const targets = resolveCompletionTargets({
      blockId,
      editorRunBlock,
      blocks,
      activeNoteId,
      timerBlock,
      activeRuntimeId,
      editorResultId,
      resolveNoteUuid,
    });
    if (!targets) return;
    const { runBlock, noteId, resultId } = targets;

    // Page-level runs (?autoStart / note Play button) bypass NoteEditor's own
    // completion hook, so no query:table was inserted — do it here so the
    // note still presents the run as a table.
    const view = editorViewRef.current ?? editorView;
    if (!editorRunBlock && view) {
      const insert = sessionQueryInsert(view.state, blockId, resultId, runBlock);
      if (insert) {
        view.dispatch({ changes: insert });
        const updatedContent = view.state.doc.toString();
        setContent(updatedContent);
        save(updatedContent);
      }
    } else if (!editorRunBlock && noteId) {
      const qWql = sessionQueryWql(resultId);
      journalNotes.getById(noteId).then((entry) => {
        if (!entry) return;
        const updatedContent = entry.rawContent.trim() + `\n\n\`\`\`query:table\n${qWql}\n\`\`\``;
        journalNotes.update(noteId, updatedContent).then(() => {
          journalNotes.listByDate(journalDate).then((entries) => {
            if (entries.length) {
              setNotes(entries);
              const pieces = entries.map((e) => e.rawContent.trim());
              setContent(pieces.join('\n\n'));
            }
          });
        });
      }).catch(() => {});
    }

    playgroundRecorder.record({
      runBlock,
      blockId,
      noteId,
      resultId,
      data: results!,
      createdAt: results?.endTime || Date.now(),
    }).catch(() => {});
    setActiveRuntimeId(null);
    setActiveNoteId(null);
  }, [resolveNoteUuid, blocks, activeRuntimeId, activeNoteId, timerBlock, editorView, save, journalDate]);

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
    }).catch(() => {
      if (!cancelled) setNotes([]);
    });
    return () => { cancelled = true; };
  }, [journalDate]);


  const { onChange: editorSaveOnChange, onBlur } = useEditorSave({
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
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{journalDate}</h1>
            <p className="text-sm text-muted-foreground">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
          </div>
          {notes.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === 'read' ? 'edit' : 'read'))}
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              {viewMode === 'read' ? 'Edit' : 'Read mode'}
            </button>
          )}
        </header>
        {notes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No Notes on this date yet.</p>
        ) : (
          /* Read mode keeps the editor mounted — same markdown surface, just
             non-editable (#1008). Remount on toggle re-creates the view. */
          <NoteEditor
            key={viewMode}
            value={content}
            onChange={onChange}
            onBlur={onBlur}
            noteId={journalDate}
            readonly={viewMode === 'read'}
            theme={theme}
            showLineNumbers={false}
            onBlocksChange={setBlocks}
            onCompleteWorkout={handleCompleteWorkout}
            onViewCreated={handleViewCreated}
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
          onCompleteWorkout={(blockId, results) =>
            handleCompleteWorkout(blockId, results, activeRuntimeId ?? undefined, undefined)
          }
          autoStart
        />
      )}
    </WorkbenchSessionProvider>
  );
}
