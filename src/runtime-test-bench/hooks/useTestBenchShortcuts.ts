import { useEffect, useCallback } from 'react';

/**
 * Keyboard shortcut configuration for Runtime Test Bench
 */
export interface TestBenchShortcuts {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onStep?: () => void;
  onCompile?: () => void;
  onFind?: () => void;
  onToggleComments?: () => void;
}

/**
 * Hook for handling keyboard shortcuts in the Runtime Test Bench
 * Supports all standard debugging shortcuts with proper event handling
 */
export const useTestBenchShortcuts = (shortcuts: TestBenchShortcuts) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { ctrlKey, shiftKey, key } = event;

    // Prevent default browser behavior for our shortcuts
    const shouldPreventDefault = (
      key === ' ' || // Space
      key === 'F5' ||
      key === 'F10' ||
      key === 'F11' ||
      (ctrlKey && (key === 'Enter' || key === 'r' || key === 'f' || key === '/'))
    );

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    // Handle shortcuts
    if (key === ' ' && !ctrlKey && !shiftKey) {
      // Space: Play/Pause toggle
      // Note: Could be play or pause depending on current state
      // For now, we'll assume play if available, otherwise pause
      if (shortcuts.onPlay) {
        shortcuts.onPlay();
      } else if (shortcuts.onPause) {
        shortcuts.onPause();
      }
    } else if (ctrlKey && !shiftKey && key === 'Enter') {
      // Ctrl+Enter: Execute
      shortcuts.onPlay?.();
    } else if (ctrlKey && !shiftKey && key === 'r') {
      // Ctrl+R: Reset
      shortcuts.onReset?.();
    } else if (key === 'F5' && !ctrlKey && !shiftKey) {
      // F5: Execute
      shortcuts.onPlay?.();
    } else if (key === 'F10' && !ctrlKey && !shiftKey) {
      // F10: Step
      shortcuts.onStep?.();
    } else if (key === 'F11' && !ctrlKey && !shiftKey) {
      // F11: Pause
      shortcuts.onPause?.();
    } else if (key === 'F5' && !ctrlKey && shiftKey) {
      // Shift+F5: Stop
      shortcuts.onStop?.();
    } else if (ctrlKey && !shiftKey && key === 'f') {
      // Ctrl+F: Find
      shortcuts.onFind?.();
    } else if (ctrlKey && !shiftKey && key === '/') {
      // Ctrl+/: Toggle comments
      shortcuts.onToggleComments?.();
    }
  }, [shortcuts]);

  useEffect(() => {
    // Add event listener to window for global shortcuts
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};

export default useTestBenchShortcuts;