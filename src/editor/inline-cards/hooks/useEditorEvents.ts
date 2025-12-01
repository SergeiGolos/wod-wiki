import { editor } from 'monaco-editor';

/**
 * Hook to manage editor events for card manager.
 */
export const useEditorEvents = (
  editor: editor.IStandaloneCodeEditor,
  onCursorChange: (lineNumber: number) => void,
  onContentChange: () => void,
  onModelChange: () => void
) => {
  const disposables: { dispose(): void }[] = [];

  // Cursor position changes
  disposables.push(editor.onDidChangeCursorPosition((e) => {
    onCursorChange(e.position.lineNumber);
  }));

  // Content changes
  disposables.push(editor.onDidChangeModelContent(() => {
    onContentChange();
  }));

  // Model change
  disposables.push(editor.onDidChangeModel(() => {
    onModelChange();
  }));

  return {
    dispose: () => disposables.forEach(d => d.dispose())
  };
};
