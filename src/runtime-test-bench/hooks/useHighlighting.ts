import { useState, useCallback } from 'react';
import { HighlightState, HighlightSource } from '../types/interfaces';

/**
 * Hook for managing cross-panel highlighting state
 * Coordinates highlighting between editor, stack, memory, and compilation panels
 *
 * @returns Current highlight state and functions to update it
 */
export interface UseHighlightingReturn {
  highlightState: HighlightState;
  setBlockHighlight: (blockKey?: string, source?: HighlightSource) => void;
  setMemoryHighlight: (memoryId?: string, source?: HighlightSource) => void;
  setLineHighlight: (line?: number, source?: HighlightSource) => void;
  clearHighlight: () => void;
  isHighlighted: (type: 'block' | 'memory' | 'line', key?: string) => boolean;
}

export function useHighlighting(): UseHighlightingReturn {
  const [highlightState, setHighlightState] = useState<HighlightState>({});

  const setBlockHighlight = useCallback((blockKey?: string, source?: HighlightSource) => {
    setHighlightState({
      blockKey,
      memoryId: undefined,
      line: undefined,
      source
    });
  }, []);

  const setMemoryHighlight = useCallback((memoryId?: string, source?: HighlightSource) => {
    setHighlightState({
      blockKey: undefined,
      memoryId,
      line: undefined,
      source
    });
  }, []);

  const setLineHighlight = useCallback((line?: number, source?: HighlightSource) => {
    setHighlightState({
      blockKey: undefined,
      memoryId: undefined,
      line,
      source
    });
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightState({});
  }, []);

  const isHighlighted = useCallback((type: 'block' | 'memory' | 'line', key?: string): boolean => {
    switch (type) {
      case 'block':
        return highlightState.blockKey === key && !!key;
      case 'memory':
        return highlightState.memoryId === key && !!key;
      case 'line':
        return highlightState.line === key && !!key;
      default:
        return false;
    }
  }, [highlightState]);

  return {
    highlightState,
    setBlockHighlight,
    setMemoryHighlight,
    setLineHighlight,
    clearHighlight,
    isHighlighted
  };
}