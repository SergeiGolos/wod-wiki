import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextAction } from '../NextAction';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';

describe('NextAction', () => {
  let action: NextAction;
  let mockRuntime: IScriptRuntime;
  let mockCurrentBlock: any;

  beforeEach(() => {
    action = new NextAction();

    mockCurrentBlock = {
      key: { toString: () => 'test-block' },
      next: vi.fn().mockReturnValue([])
    };

    mockRuntime = {
      stack: {
        current: mockCurrentBlock,
        blocks: []
      },
      memory: {
        state: 'normal',
        allocate: vi.fn(),
        deallocate: vi.fn(),
        get: vi.fn(),
        set: vi.fn()
      },
      hasErrors: vi.fn().mockReturnValue(false),
      setError: vi.fn(),
      handle: vi.fn()
    } as any;
  });

  it('should implement IRuntimeAction interface', () => {
    expect(action).toSatisfy((a: any) =>
      'type' in a &&
      'do' in a &&
      typeof a.do === 'function'
    );
  });

  it('should have correct action type', () => {
    expect(action.type).toBe('next');
  });

  it('should have readonly type property', () => {
    expect(() => {
      (action as any).type = 'modified';
    }).toThrow();
  });

  it('should execute successfully with valid runtime', () => {
    expect(() => action.do(mockRuntime)).not.toThrow();
  });

  it('should call next() method on current block', () => {
    action.do(mockRuntime);
    expect(mockCurrentBlock.next).toHaveBeenCalledTimes(1);
  });

  it('should handle empty next actions array', () => {
    vi.mocked(mockCurrentBlock.next).mockReturnValue([]);
    action.do(mockRuntime);
    expect(mockCurrentBlock.next).toHaveBeenCalled();
  });

  it('should execute multiple actions returned by block.next(runtime)', () => {
    const mockAction1 = { do: vi.fn() };
    const mockAction2 = { do: vi.fn() };
    vi.mocked(mockCurrentBlock.next).mockReturnValue([mockAction1, mockAction2]);

    action.do(mockRuntime);

    expect(mockAction1.do).toHaveBeenCalledWith(mockRuntime);
    expect(mockAction2.do).toHaveBeenCalledWith(mockRuntime);
  });

  it('should handle single action returned by block.next(runtime)', () => {
    const mockAction = { do: vi.fn() };
    vi.mocked(mockCurrentBlock.next).mockReturnValue([mockAction]);

    action.do(mockRuntime);

    expect(mockAction.do).toHaveBeenCalledWith(mockRuntime);
  });

  it('should handle no current block gracefully', () => {
    mockRuntime.stack.current = null as any;
    expect(() => action.do(mockRuntime)).not.toThrow();
  });

  it('should handle undefined current block gracefully', () => {
    mockRuntime.stack.current = undefined;
    expect(() => action.do(mockRuntime)).not.toThrow();
  });

  it('should set error state when runtime has errors', () => {
    vi.mocked(mockRuntime.hasErrors).mockReturnValue(true);

    action.do(mockRuntime);

    // Should not attempt to execute when runtime has errors
    expect(mockCurrentBlock.next).not.toHaveBeenCalled();
  });

  it('should set error state when block.next(runtime) throws exception', () => {
    const error = new Error('Block execution failed');
    vi.mocked(mockCurrentBlock.next).mockImplementation(() => {
      throw error;
    });

    action.do(mockRuntime);

    expect(mockRuntime.setError).toHaveBeenCalledWith(error);
  });

  it('should log error when block.next(runtime) throws exception', () => {
    const error = new Error('Block execution failed');
    vi.mocked(mockCurrentBlock.next).mockImplementation(() => {
      throw error;
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    action.do(mockRuntime);

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ NEXT-BLOCK | Error in next-action',
      expect.objectContaining({
        context: expect.objectContaining({
          blockKey: 'test-block',
          stackDepth: 0
        }),
        error: 'Block execution failed'
      })
    );
    consoleSpy.mockRestore();
  });

  it('should log message when no current block available', () => {
    mockRuntime.stack.current = null as any;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    action.do(mockRuntime);

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ NEXT-BLOCK | Error in next-action',
      expect.objectContaining({
        error: expect.stringContaining('No current block')
      })
    );
    consoleSpy.mockRestore();
  });

  it('should log block advancement details', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(mockCurrentBlock.next).mockReturnValue([]);

    action.do(mockRuntime);

    expect(consoleSpy).toHaveBeenCalledWith(
      '🎯 NEXT-BLOCK | Action Start',
      expect.objectContaining({
        block: 'test-block',
        depth: 0
      })
    );
    consoleSpy.mockRestore();
  });

  it('should log completion with new stack depth', () => {
    mockRuntime.stack.blocks = [mockCurrentBlock, {}];
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(mockCurrentBlock.next).mockReturnValue([]);

    action.do(mockRuntime);

    expect(consoleSpy).toHaveBeenCalledWith(
      '✅ NEXT-BLOCK | Action Complete',
      expect.objectContaining({
        actionsExecuted: 0,
        newDepth: 2
      })
    );
    consoleSpy.mockRestore();
  });

  it('should validate runtime state before execution', () => {
    const incompleteRuntime = { stack: null } as any;

    expect(() => action.do(incompleteRuntime)).not.toThrow();
  });

  it('should handle corrupted memory state', () => {
    mockRuntime.memory.state = 'corrupted';

    expect(() => action.do(mockRuntime)).not.toThrow();
    expect(mockCurrentBlock.next).not.toHaveBeenCalled();
  });

  it('should handle action execution errors gracefully', () => {
    const mockAction = { do: vi.fn().mockImplementation(() => {
      throw new Error('Action execution failed');
    })};
    vi.mocked(mockCurrentBlock.next).mockReturnValue([mockAction]);

    expect(() => action.do(mockRuntime)).not.toThrow();
    expect(mockAction.do).toHaveBeenCalled();
  });

  it('should execute within performance targets', () => {
    vi.mocked(mockCurrentBlock.next).mockReturnValue([]);

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      action.do(mockRuntime);
    }
    const end = performance.now();
    const avgTime = (end - start) / 100;

    expect(avgTime).toBeLessThan(50); // Target: <50ms per action execution
  });

  it('should handle nested action execution', () => {
    const nestedAction = new NextAction();
    vi.mocked(mockCurrentBlock.next).mockReturnValue([nestedAction]);

    // Create a second mock block for nested action
    const nestedBlock = {
      key: { toString: () => 'nested-block' },
      next: vi.fn().mockReturnValue([])
    };

    const mockRuntimeWithNested = {
      ...mockRuntime,
      stack: {
        current: nestedBlock,
        blocks: [mockCurrentBlock, nestedBlock]
      }
    } as any;

    action.do(mockRuntime);
    nestedAction.do(mockRuntimeWithNested);

    expect(nestedBlock.next).toHaveBeenCalled();
  });

  it('should be reusable for multiple executions', () => {
    action.do(mockRuntime);
    action.do(mockRuntime);
    action.do(mockRuntime);

    expect(mockCurrentBlock.next).toHaveBeenCalledTimes(3);
  });
});