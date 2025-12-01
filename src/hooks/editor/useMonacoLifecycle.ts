import { useRef, useEffect, useState } from 'react';
import { editor as monacoEditor } from 'monaco-editor';

/**
 * Hook for managing Monaco editor lifecycle (mount/unmount).
 */
export const useMonacoLifecycle = (
  initialContent: string | undefined,
  onMount?: (editor: monacoEditor.IStandaloneCodeEditor) => void
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  return {
    containerRef,
    editorRef,
    isMounted,
    setIsMounted
  };
};
