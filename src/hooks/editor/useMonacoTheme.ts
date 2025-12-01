import { useEffect } from 'react';
import { editor as monacoEditor } from 'monaco-editor';
import { useTheme } from '../../components/theme/ThemeProvider';

/**
 * Hook to sync Monaco theme with application theme.
 */
export const useMonacoTheme = (editor: monacoEditor.IStandaloneCodeEditor | null, theme: string | undefined) => {
  const { theme: appTheme } = useTheme();

  useEffect(() => {
    if (!editor) return;

    // Use prop theme if provided, otherwise derive from app theme
    const activeTheme = theme || (appTheme === 'dark' ? 'wod-dark' : 'wod-light');

    // Check if theme matches 'vs-dark' or 'wod-dark' etc.
    // This logic might need to align with specific custom themes registered in the app
    monacoEditor.setTheme(activeTheme);
  }, [editor, theme, appTheme]);
};
