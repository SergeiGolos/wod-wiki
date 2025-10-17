/**
 * TestBenchContext Tests
 * 
 * Tests React Context providers for highlighting and preferences state management.
 * 
 * Test Strategy:
 * - Test provider renders children
 * - Test hooks throw error outside provider
 * - Test highlighting state changes
 * - Test preferences state changes
 * - Test context isolation (changes in one don't affect the other)
 */

import { describe, it, expect } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  TestBenchProvider,
  useHighlighting,
  usePreferences,
  type HighlightTarget
} from './TestBenchContext';

describe('TestBenchContext', () => {
  describe('TestBenchProvider', () => {
    it('should render children', () => {
      render(
        <TestBenchProvider>
          <div data-testid="child">Test Content</div>
        </TestBenchProvider>
      );

      expect(screen.getByTestId('child')).toHaveTextContent('Test Content');
    });

    it('should provide highlighting context to children', () => {
      const TestComponent = () => {
        const { highlightedBlock } = useHighlighting();
        return <div data-testid="highlight">{highlightedBlock || 'none'}</div>;
      };

      render(
        <TestBenchProvider>
          <TestComponent />
        </TestBenchProvider>
      );

      expect(screen.getByTestId('highlight')).toHaveTextContent('none');
    });

    it('should provide preferences context to children', () => {
      const TestComponent = () => {
        const { showMetrics } = usePreferences();
        return <div data-testid="prefs">{showMetrics ? 'shown' : 'hidden'}</div>;
      };

      render(
        <TestBenchProvider>
          <TestComponent />
        </TestBenchProvider>
      );

      expect(screen.getByTestId('prefs')).toHaveTextContent('shown');
    });
  });

  describe('useHighlighting', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useHighlighting());
      }).toThrow('useHighlighting must be used within TestBenchProvider');
    });

    it('should start with no highlights', () => {
      const { result } = renderHook(() => useHighlighting(), {
        wrapper: TestBenchProvider
      });

      expect(result.current.highlightedBlock).toBeUndefined();
      expect(result.current.highlightedMemory).toBeUndefined();
      expect(result.current.highlightedLine).toBeUndefined();
    });

    it('should highlight a block', () => {
      const { result } = renderHook(() => useHighlighting(), {
        wrapper: TestBenchProvider
      });

      const target: HighlightTarget = { type: 'block', id: 'block-1' };

      act(() => {
        result.current.setHighlight(target);
      });

      expect(result.current.highlightedBlock).toBe('block-1');
      expect(result.current.highlightedMemory).toBeUndefined();
      expect(result.current.highlightedLine).toBeUndefined();
    });

    it('should highlight a memory entry', () => {
      const { result } = renderHook(() => useHighlighting(), {
        wrapper: TestBenchProvider
      });

      const target: HighlightTarget = { type: 'memory', id: 'mem-1' };

      act(() => {
        result.current.setHighlight(target);
      });

      expect(result.current.highlightedMemory).toBe('mem-1');
      expect(result.current.highlightedBlock).toBeUndefined();
      expect(result.current.highlightedLine).toBeUndefined();
    });

    it('should highlight a line', () => {
      const { result } = renderHook(() => useHighlighting(), {
        wrapper: TestBenchProvider
      });

      const target: HighlightTarget = { type: 'line', line: 42 };

      act(() => {
        result.current.setHighlight(target);
      });

      expect(result.current.highlightedLine).toBe(42);
      expect(result.current.highlightedBlock).toBeUndefined();
      expect(result.current.highlightedMemory).toBeUndefined();
    });

    it('should clear previous highlight when setting new one', () => {
      const { result } = renderHook(() => useHighlighting(), {
        wrapper: TestBenchProvider
      });

      act(() => {
        result.current.setHighlight({ type: 'block', id: 'block-1' });
      });

      expect(result.current.highlightedBlock).toBe('block-1');

      act(() => {
        result.current.setHighlight({ type: 'memory', id: 'mem-1' });
      });

      expect(result.current.highlightedBlock).toBeUndefined();
      expect(result.current.highlightedMemory).toBe('mem-1');
    });

    it('should clear all highlights', () => {
      const { result } = renderHook(() => useHighlighting(), {
        wrapper: TestBenchProvider
      });

      act(() => {
        result.current.setHighlight({ type: 'block', id: 'block-1' });
      });

      expect(result.current.highlightedBlock).toBe('block-1');

      act(() => {
        result.current.clearHighlight();
      });

      expect(result.current.highlightedBlock).toBeUndefined();
      expect(result.current.highlightedMemory).toBeUndefined();
      expect(result.current.highlightedLine).toBeUndefined();
    });

    it('should handle clear target type', () => {
      const { result } = renderHook(() => useHighlighting(), {
        wrapper: TestBenchProvider
      });

      act(() => {
        result.current.setHighlight({ type: 'block', id: 'block-1' });
      });

      act(() => {
        result.current.setHighlight({ type: 'clear' });
      });

      expect(result.current.highlightedBlock).toBeUndefined();
      expect(result.current.highlightedMemory).toBeUndefined();
      expect(result.current.highlightedLine).toBeUndefined();
    });
  });

  describe('usePreferences', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => usePreferences());
      }).toThrow('usePreferences must be used within TestBenchProvider');
    });

    it('should start with default preferences', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: TestBenchProvider
      });

      expect(result.current.showMetrics).toBe(true);
      expect(result.current.showIcons).toBe(true);
      expect(result.current.expandAll).toBe(false);
      expect(result.current.theme).toBe('light');
    });

    it('should toggle showMetrics', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: TestBenchProvider
      });

      expect(result.current.showMetrics).toBe(true);

      act(() => {
        result.current.toggleMetrics();
      });

      expect(result.current.showMetrics).toBe(false);

      act(() => {
        result.current.toggleMetrics();
      });

      expect(result.current.showMetrics).toBe(true);
    });

    it('should toggle showIcons', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: TestBenchProvider
      });

      expect(result.current.showIcons).toBe(true);

      act(() => {
        result.current.toggleIcons();
      });

      expect(result.current.showIcons).toBe(false);

      act(() => {
        result.current.toggleIcons();
      });

      expect(result.current.showIcons).toBe(true);
    });

    it('should set expandAll', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: TestBenchProvider
      });

      expect(result.current.expandAll).toBe(false);

      act(() => {
        result.current.setExpandAll(true);
      });

      expect(result.current.expandAll).toBe(true);

      act(() => {
        result.current.setExpandAll(false);
      });

      expect(result.current.expandAll).toBe(false);
    });

    it('should set theme', () => {
      const { result } = renderHook(() => usePreferences(), {
        wrapper: TestBenchProvider
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
    });
  });

  describe('Context Isolation', () => {
    it('should not affect preferences when highlighting changes', () => {
      const { result: highlighting } = renderHook(() => useHighlighting(), {
        wrapper: TestBenchProvider
      });

      const { result: preferences } = renderHook(() => usePreferences(), {
        wrapper: TestBenchProvider
      });

      const initialShowMetrics = preferences.current.showMetrics;

      act(() => {
        highlighting.current.setHighlight({ type: 'block', id: 'block-1' });
      });

      expect(preferences.current.showMetrics).toBe(initialShowMetrics);
    });

    it('should not affect highlighting when preferences change', () => {
      const { result: highlighting } = renderHook(() => useHighlighting(), {
        wrapper: TestBenchProvider
      });

      const { result: preferences } = renderHook(() => usePreferences(), {
        wrapper: TestBenchProvider
      });

      act(() => {
        highlighting.current.setHighlight({ type: 'block', id: 'block-1' });
      });

      const initialHighlightedBlock = highlighting.current.highlightedBlock;

      act(() => {
        preferences.current.toggleMetrics();
      });

      expect(highlighting.current.highlightedBlock).toBe(initialHighlightedBlock);
    });
  });
});
