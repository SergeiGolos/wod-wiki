import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { v7 as uuidv7 } from 'uuid';
import { whiteboardScriptLanguage } from '@/hooks/useRuntimeParser';
import { IndexedDBNotePersistence, type INotePersistence } from '@/services/persistence';

export function resolveNotePersistence(
  cache: { current: INotePersistence | null },
  provided?: INotePersistence,
): INotePersistence {
  if (provided) {
    return provided;
  }

  if (!cache.current) {
    cache.current = new IndexedDBNotePersistence();
  }

  return cache.current;
}

export function createFileDropHandler(
  noteId: string | undefined,
  notePersistence: INotePersistence,
): Extension {
  return EditorView.domEventHandlers({
    drop: (event, view) => {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return false;

      event.preventDefault();

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return false;

      Array.from(files).forEach(async (file) => {
        const id = uuidv7();
        const reader = new FileReader();

        reader.onload = async () => {
          const data = reader.result as ArrayBuffer;

          if (noteId) {
            try {
              await notePersistence.mutateNote(noteId, {
                attachments: {
                  add: [{
                    id,
                    file: new File([data], file.name, { type: file.type }),
                  }],
                },
              });
            } catch (error) {
              console.warn('[NoteEditor] Attachment persist skipped:', error);
            }
          }

          const isImage = file.type.startsWith('image/');
          const prefix = isImage ? '!' : '';
          const markdown = `\n${prefix}[${file.name}](${id})\n`;

          view.dispatch({
            changes: { from: pos, insert: markdown },
            selection: { anchor: pos + markdown.length },
          });
        };

        reader.readAsArrayBuffer(file);
      });

      return true;
    },
  });
}

export function resolveWhiteboardCodeLanguage(info: string | null | undefined) {
  const base = info?.split(':', 1)[0];
  if (base === 'time' || base === 'log') {
    return whiteboardScriptLanguage;
  }

  return null;
}
