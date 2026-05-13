import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { v4 as uuidv4 } from 'uuid';
import { whiteboardScriptLanguage } from '@/hooks/useRuntimeParser';
import { getAnalyticsFromLogs } from '@/hooks/useWorkbenchServices';
import { IndexedDBNotePersistence, type INotePersistence } from '@/services/persistence';
import type { Segment } from '@/core/models/AnalyticsModels';
import type { WorkoutResult } from '@/types/storage';

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
        const id = uuidv4();
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

export function deriveReviewSegments(result: WorkoutResult): Segment[] {
  if (!result?.data?.logs?.length) {
    return [];
  }

  return getAnalyticsFromLogs(result.data.logs, result.data.startTime).segments;
}

export function resolveWhiteboardCodeLanguage(info: string | null | undefined) {
  if (info === 'wod' || info === 'log' || info === 'plan') {
    return whiteboardScriptLanguage;
  }

  return null;
}
