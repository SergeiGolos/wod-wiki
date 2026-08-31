import { useState, useEffect } from 'react';

/**
 * Hook to manage application and editor theme state.
 */
export const useEditorTheme = (initialTheme: string = 'vs') => {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    // If we're following system theme or similar global state,
    // we could add listeners here.
    setTheme((current) => (current !== initialTheme ? initialTheme : current));
  }, [initialTheme]);

  return {
    theme,
    setTheme,
    isDark: theme === 'dark' || theme === 'vs-dark'
  };
};
