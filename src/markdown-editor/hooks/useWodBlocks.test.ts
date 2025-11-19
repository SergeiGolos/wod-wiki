// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWodBlocks } from './useWodBlocks';
import { editor as monacoEditor } from 'monaco-editor';

// Mock block detection
vi.mock('../utils/blockDetection', () => ({
  detectWodBlocks: vi.fn((content) => {
    if (content.includes('wod')) {
      return [{
        id: 'block-1',
        startLine: 0,
        endLine: 2,
        content: 'wod\nTest\n```',
        state: 'idle',
        widgetIds: {}
      }];
    }
    return [];
  }),
  findBlockAtLine: vi.fn((blocks, line) => {
    return blocks.find(b => line >= b.startLine && line <= b.endLine);
  })
}));

describe('useWodBlocks', () => {
  let mockEditor: any;
  let onDidChangeCursorPositionCallback: any;

  beforeEach(() => {
    onDidChangeCursorPositionCallback = null;
    mockEditor = {
      getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
      onDidChangeCursorPosition: vi.fn((cb) => {
        onDidChangeCursorPositionCallback = cb;
        return { dispose: vi.fn() };
      })
    };
  });

  it('should detect blocks and set active block', async () => {
    const { result } = renderHook(() => useWodBlocks(mockEditor, '```wod\nTest\n```'));

    // Wait for debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.activeBlock).not.toBeNull();
    expect(result.current.activeBlock?.id).toBe('block-1');
  });

  it('should not update blocks if content is same', async () => {
    const { result, rerender } = renderHook(
      ({ content }) => useWodBlocks(mockEditor, content),
      { initialProps: { content: '```wod\nTest\n```' } }
    );

    // Wait for initial detection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    const initialBlocks = result.current.blocks;

    // Rerender with same content
    rerender({ content: '```wod\nTest\n```' });

    // Wait for debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    // Should be same reference due to optimization
    expect(result.current.blocks).toBe(initialBlocks);
  });

  it('should update active block when cursor moves', async () => {
    const { result } = renderHook(() => useWodBlocks(mockEditor, '```wod\nTest\n```'));

    // Wait for detection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(result.current.activeBlock).not.toBeNull();

    // Move cursor outside
    mockEditor.getPosition.mockReturnValue({ lineNumber: 10, column: 1 });
    
    act(() => {
      if (onDidChangeCursorPositionCallback) {
        onDidChangeCursorPositionCallback();
      }
    });

    expect(result.current.activeBlock).toBeNull();
  });
});
