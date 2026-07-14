import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { NoteEditor } from '@/components/organisms/editor/NoteEditor';
import type { HistoryEntry } from '@/types/history';
import { journalNotePath } from '../lib/journalRoute';
import { journalNotes } from '../services/journalNotes';

interface JournalDatePageProps {
  journalDate: string;
  theme: string;
  onViewCreated?: (view: EditorView) => void;
}

function JournalDateNote({ note, theme, onViewCreated }: { note: HistoryEntry; theme: string; onViewCreated?: (view: EditorView) => void }) {
  const [content, setContent] = useState(note.rawContent);
  const timeoutRef = useRef<number | undefined>(undefined);

  const save = useCallback((value: string) => {
    journalNotes.update(note.id, value).catch(() => {});
  }, [note.id]);

  const onChange = useCallback((value: string) => {
    setContent(value);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => save(value), 500);
  }, [save]);

  useEffect(() => () => {
    clearTimeout(timeoutRef.current);
    save(content);
  }, [content, save]);

  return (
    <section data-note-id={note.id} className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <header className="mb-3 flex items-center justify-between gap-3">
        <a className="text-sm font-semibold text-foreground hover:underline" href={journalNotePath(note.journalDate ?? '', note.id)}>
          {note.title}
        </a>
        <span className="font-mono text-xs text-muted-foreground">{note.id}</span>
      </header>
      <NoteEditor
        value={content}
        onChange={onChange}
        noteId={note.id}
        theme={theme}
        showLineNumbers={false}
        enableInlineRuntime={false}
        onViewCreated={onViewCreated}
      />
    </section>
  );
}

export function JournalDatePage({ journalDate, theme, onViewCreated }: JournalDatePageProps) {
  const [notes, setNotes] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    journalNotes.listByDate(journalDate).then((entries) => {
      if (!cancelled) setNotes(entries);
    }).catch(() => {
      if (!cancelled) setNotes([]);
    });
    return () => { cancelled = true; };
  }, [journalDate]);

  if (!notes) return <div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold">{journalDate}</h1>
        <p className="text-sm text-muted-foreground">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
      </header>
      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No Notes on this date yet.</p>
      ) : notes.map(note => <JournalDateNote key={note.id} note={note} theme={theme} onViewCreated={onViewCreated} />)}
    </div>
  );
}
