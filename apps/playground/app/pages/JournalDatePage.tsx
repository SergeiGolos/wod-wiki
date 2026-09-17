import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import type { ScriptBlock } from '@/components/Editor/types';
import type { HistoryEntry } from '@/types/history';
import { journalNotes } from '../services/journalNotes';
import { playgroundRecorder } from '@/services/resultRecorder';
import { FullscreenTimer } from '@/components/organisms/review/FullscreenTimer';
import { useSearchParams, Link } from 'react-router-dom';
import { noteByIdPath } from '../lib/routes';
import { pendingRuntimes } from '../runtimeStore';
import { WorkbenchSessionProvider } from '@/stores/workbenchSessionStore';
import { ResponsiveActions } from '../nav/ResponsiveActions'
import { Button } from '@/components/atoms/primitives/button'
import { notePersistence } from '@/services/persistence';
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import { NoteEditor } from '@/components/organisms/editor/NoteEditor';
import { sessionQueryInsert, sessionQueryWql } from '@bitcobblers/wod-wiki-ui/extensions';
import { resolveCompletionTargets } from '../lib/workoutCompletion';

import { JournalPageShell } from '@/panels/page-shells';
const journalContentProvider = new IndexedDBContentProvider();

interface JournalDatePageProps {
  journalDate: string;
  theme: string;
  onViewCreated?: (view: EditorView) => void;
}


export function JournalDatePage({ journalDate, theme, onViewCreated }: JournalDatePageProps) {
  const [notes, setNotes] = useState<HistoryEntry[] | null>(null);
  const [viewMode, setViewMode] = useState<'read' | 'edit'>('edit');
  const [searchParams, setSearchParams] = useSearchParams();
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerBlock, setTimerBlock] = useState<ScriptBlock | null>(null);
  const [activeRuntimeId, setActiveRuntimeId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const editorViewsRef = useRef<Map<string, EditorView>>(new Map());
  const editorViewRef = useRef<EditorView | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const handleViewCreatedForNote = useCallback((noteId: string, view: EditorView) => {
    editorViewsRef.current.set(noteId, view);
    if (!editorViewRef.current) {
      editorViewRef.current = view;
      setEditorView(view);
      onViewCreated?.(view);
    }
  }, [onViewCreated]);

  const selectedNoteId = searchParams.get('note');
  useEffect(() => {
    if (!selectedNoteId || !notes) return;
    const el = document.getElementById(`note-${selectedNoteId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedNoteId, notes]);
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

  const handleNoteContentChange = useCallback((noteId: string, newContent: string) => {
    setNotes((prev) => prev?.map((n) => (n.id === noteId ? { ...n, rawContent: newContent } : n)) ?? prev);
    journalNotes.update(noteId, newContent).catch(() => {});
  }, []);

  const handleCompleteWorkout = useCallback((blockId: string, results: ScriptBlock["results"], editorResultId?: string, editorRunBlock?: Pick<ScriptBlock, "id" | "contentId">, targetNoteId?: string) => {
    const noteId = targetNoteId ?? activeNoteId ?? notes?.[0]?.id ?? journalDate;
    const targets = resolveCompletionTargets({
      blockId,
      editorRunBlock,
      blocks,
      activeNoteId: noteId,
      timerBlock,
      activeRuntimeId,
      editorResultId,
      resolveNoteUuid: () => noteId,
    });
    if (!targets) return;
    const { runBlock, resultId } = targets;

    const view = editorViewsRef.current.get(noteId) ?? editorViewRef.current ?? editorView;
    if (!editorRunBlock && view) {
      const insert = sessionQueryInsert(view.state, blockId, resultId, runBlock);
      if (insert) {
        view.dispatch({ changes: insert });
        const updatedContent = view.state.doc.toString();
        handleNoteContentChange(noteId, updatedContent);
      }
    } else if (!editorRunBlock && noteId) {
      const qWql = sessionQueryWql(resultId);
      journalNotes.getById(noteId).then((entry) => {
        if (!entry) return;
        const updatedContent = entry.rawContent.trim() + `\n\n\`\`\`query:table\n${qWql}\n\`\`\``;
        journalNotes.update(noteId, updatedContent).then(() => {
          journalNotes.listByDate(journalDate).then((entries) => {
            if (entries.length) setNotes(entries);
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
  }, [blocks, activeRuntimeId, activeNoteId, timerBlock, editorView, journalDate, notes, handleNoteContentChange]);

  useEffect(() => {
    let cancelled = false;
    journalNotes.listByDate(journalDate).then((entries) => {
      if (cancelled) return;
      setNotes(entries);
    }).catch(() => {
      if (!cancelled) setNotes([]);
    });
    return () => { cancelled = true; };
  }, [journalDate]);

  if (!notes) return <div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>;

  const editToggle = notes.length > 0 ? (
    <Button
      type="button"
      onClick={() => setViewMode((m) => (m === 'read' ? 'edit' : 'read'))}
      variant="outline"
    >
      {viewMode === 'read' ? 'Edit' : 'Read mode'}
    </Button>
  ) : undefined;

  return (
    <WorkbenchSessionProvider notePersistence={notePersistence} provider={journalContentProvider}>
      <JournalPageShell
          title={journalDate}
          subtitle={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
          actions={<ResponsiveActions navbar={editToggle} />}
          editor={
        <div className="flex flex-col gap-8 px-4 py-6 sm:px-6">
          {notes.length > 1 && (
            <nav aria-label="Notes on this date" className="flex flex-wrap gap-2">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  to={noteByIdPath(note.id)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  {note.title}
                </Link>
              ))}
            </nav>
          )}
          {notes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No Notes on this date yet.</p>
          ) : notes.length === 1 ? (
            <NoteEditor
              key={notes[0].id}
              value={notes[0].rawContent}
              onChange={(val) => handleNoteContentChange(notes[0].id, val)}
              noteId={notes[0].id}
              readonly={viewMode === 'read'}
              theme={theme}
              showLineNumbers={false}
              onBlocksChange={setBlocks}
              onCompleteWorkout={(bId, res, resId, runB) => handleCompleteWorkout(bId, res, resId, runB, notes[0].id)}
              onViewCreated={(view) => handleViewCreatedForNote(notes[0].id, view)}
            />
          ) : (
            <div className="space-y-6">
              {notes.map((note, index) => (
                <div key={note.id} id={`note-${note.id}`} className="rounded-lg border border-border/60 p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <Link
                      to={noteByIdPath(note.id)}
                      className="text-sm font-semibold hover:underline text-foreground"
                    >
                      {note.title || `Note ${index + 1}`}
                    </Link>
                  </div>
                  <NoteEditor
                    value={note.rawContent}
                    onChange={(val) => handleNoteContentChange(note.id, val)}
                    noteId={note.id}
                    readonly={viewMode === 'read'}
                    theme={theme}
                    showLineNumbers={false}
                    onBlocksChange={setBlocks}
                    onCompleteWorkout={(bId, res, resId, runB) => handleCompleteWorkout(bId, res, resId, runB, note.id)}
                    onViewCreated={(view) => handleViewCreatedForNote(note.id, view)}
                  />
                </div>
              ))}
            </div>
          )}
      </div>
          }
      />
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
