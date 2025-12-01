import { useEffect } from 'react';
import { editor as monacoEditor } from 'monaco-editor';

/**
 * Hook to handle editor resizing.
 */
export const useEditorResize = (editor: monacoEditor.IStandaloneCodeEditor | null) => {
  useEffect(() => {
    if (!editor) return;

    const handleResize = () => {
      editor.layout();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [editor]);
};
