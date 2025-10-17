/**
 * TestBenchContext - React Context providers for cross-panel coordination
 * 
 * Provides shared state for highlighting and UI preferences across all panels
 * without prop drilling. Contexts are split for performance optimization.
 * 
 * Architecture Decision:
 * - Two separate contexts (HighlightingContext, PreferencesContext)
 * - Split prevents unnecessary re-renders (highlighting changes frequently, preferences rarely)
 * - Panels consume only the context they need
 * 
 * Phase: 1.4 Foundation - Infrastructure
 */

import React, { createContext, useState, useCallback, useContext, type ReactNode } from 'react';

// ============================================================================
// Highlighting Context - Changes frequently on hover events
// ============================================================================

export type HighlightTarget =
  | { type: 'block'; id: string }
  | { type: 'memory'; id: string }
  | { type: 'line'; line: number }
  | { type: 'clear' };

export interface HighlightingContextValue {
  highlightedBlock?: string;
  highlightedMemory?: string;
  highlightedLine?: number;
  setHighlight: (target: HighlightTarget) => void;
  clearHighlight: () => void;
}

export const HighlightingContext = createContext<HighlightingContextValue | null>(null);

/**
 * Hook to access highlighting state and controls
 * Must be used within TestBenchProvider
 */
export const useHighlighting = (): HighlightingContextValue => {
  const context = useContext(HighlightingContext);
  if (!context) {
    throw new Error('useHighlighting must be used within TestBenchProvider');
  }
  return context;
};

/**
 * Provider implementation for highlighting state
 * Internal hook that manages state and provides the context value
 */
const useHighlightingState = (): HighlightingContextValue => {
  const [highlightedBlock, setHighlightedBlock] = useState<string | undefined>();
  const [highlightedMemory, setHighlightedMemory] = useState<string | undefined>();
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>();

  const setHighlight = useCallback((target: HighlightTarget) => {
    // Clear all highlights first
    setHighlightedBlock(undefined);
    setHighlightedMemory(undefined);
    setHighlightedLine(undefined);

    // Set new highlight based on target type
    switch (target.type) {
      case 'block':
        setHighlightedBlock(target.id);
        break;
      case 'memory':
        setHighlightedMemory(target.id);
        break;
      case 'line':
        setHighlightedLine(target.line);
        break;
      case 'clear':
        // Already cleared above
        break;
    }
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedBlock(undefined);
    setHighlightedMemory(undefined);
    setHighlightedLine(undefined);
  }, []);

  return {
    highlightedBlock,
    highlightedMemory,
    highlightedLine,
    setHighlight,
    clearHighlight
  };
};

// ============================================================================
// Preferences Context - Changes rarely on user toggles
// ============================================================================

export interface PreferencesContextValue {
  showMetrics: boolean;
  showIcons: boolean;
  expandAll: boolean;
  theme: 'light' | 'dark';
  toggleMetrics: () => void;
  toggleIcons: () => void;
  setExpandAll: (expand: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

/**
 * Hook to access UI preferences state and controls
 * Must be used within TestBenchProvider
 */
export const usePreferences = (): PreferencesContextValue => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within TestBenchProvider');
  }
  return context;
};

/**
 * Provider implementation for UI preferences
 * Internal hook that manages state and provides the context value
 */
const usePreferencesState = (): PreferencesContextValue => {
  const [showMetrics, setShowMetrics] = useState(true);
  const [showIcons, setShowIcons] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleMetrics = useCallback(() => {
    setShowMetrics(prev => !prev);
  }, []);

  const toggleIcons = useCallback(() => {
    setShowIcons(prev => !prev);
  }, []);

  return {
    showMetrics,
    showIcons,
    expandAll,
    theme,
    toggleMetrics,
    toggleIcons,
    setExpandAll,
    setTheme
  };
};

// ============================================================================
// Combined Provider
// ============================================================================

export interface TestBenchProviderProps {
  children: ReactNode;
}

/**
 * TestBench Context Provider
 * 
 * Wraps the entire RuntimeTestBench component tree to provide shared state.
 * Uses nested providers for highlighting and preferences contexts.
 * 
 * Usage:
 * ```typescript
 * export const RuntimeTestBench: React.FC<Props> = ({ ... }) => {
 *   return (
 *     <TestBenchProvider>
 *       <EditorPanel ... />
 *       <RuntimeStackPanel ... />
 *       <MemoryPanel ... />
 *     </TestBenchProvider>
 *   );
 * };
 * ```
 * 
 * Panels consume contexts with hooks:
 * ```typescript
 * const { highlightedBlock, setHighlight } = useHighlighting();
 * const { showMetrics, toggleMetrics } = usePreferences();
 * ```
 */
export const TestBenchProvider: React.FC<TestBenchProviderProps> = ({ children }) => {
  const highlighting = useHighlightingState();
  const preferences = usePreferencesState();

  return (
    <HighlightingContext.Provider value={highlighting}>
      <PreferencesContext.Provider value={preferences}>
        {children}
      </PreferencesContext.Provider>
    </HighlightingContext.Provider>
  );
};
