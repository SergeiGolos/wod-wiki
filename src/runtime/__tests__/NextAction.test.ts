import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { NextAction } from '../NextAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

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
        blocks: [mockCurrentBlock]
      },
      memory: {
        state: 'normal',
        allocate: vi.fn(),
        deallocate: vi.fn(),
        get: vi.fn(),
        set: vi.fn()
      },
      errors: [],
      handle: vi.fn()
    } as any;
  });

  it('should have correct action type', () => {
    expect(action.type).toBe('next');
  });

  it('should execute successfully with valid runtime', () => {
    expect(() => action.do(mockRuntime)).not.toThrow();
  });

  it('should call next() method on current block', () => {
    action.do(mockRuntime);
    expect(mockCurrentBlock.next).toHaveBeenCalledTimes(1);
  });

  it('should handle empty next actions array', () => {
    mockCurrentBlock.next.mockReturnValue([]);
    action.do(mockRuntime);
    expect(mockCurrentBlock.next).toHaveBeenCalled();
  });

  it('should execute multiple actions returned by block.next(runtime)', () => {
    const mockAction1 = { do: vi.fn() };
    const mockAction2 = { do: vi.fn() };
    mockCurrentBlock.next.mockReturnValue([mockAction1, mockAction2]);

    action.do(mockRuntime);

    expect(mockAction1.do).toHaveBeenCalledWith(mockRuntime);
    expect(mockAction2.do).toHaveBeenCalledWith(mockRuntime);
  });

  it('should handle single action returned by block.next(runtime)', () => {
    const mockAction = { do: vi.fn() };
    mockCurrentBlock.next.mockReturnValue([mockAction]);

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
    mockRuntime.errors = [{ error: new Error('Existing error'), source: 'test' }];

    action.do(mockRuntime);

    // Should not attempt to execute when runtime has errors
    expect(mockCurrentBlock.next).not.toHaveBeenCalled();
  });

  it('should add to errors array when block.next(runtime) throws exception', () => {
    const error = new Error('Block execution failed');
    mockCurrentBlock.next.mockImplementation(() => {
      throw error;
    });

    action.do(mockRuntime);

    expect(mockRuntime.errors.length).toBe(1);
    expect(mockRuntime.errors[0].error).toBe(error);
    expect(mockRuntime.errors[0].source).toBe('NextAction');
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
    const mockAction = {
      do: vi.fn().mockImplementation(() => {
        throw new Error('Action execution failed');
      })
    };
    mockCurrentBlock.next.mockReturnValue([mockAction]);

    expect(() => action.do(mockRuntime)).not.toThrow();
    expect(mockAction.do).toHaveBeenCalled();
  });

  it('should execute within performance targets', () => {
    mockCurrentBlock.next.mockReturnValue([]);

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
    mockCurrentBlock.next.mockReturnValue([nestedAction]);

    // Create a second mock block for nested action
    const nestedBlock = {
      key: { toString: () => 'nested-block' },
      next: vi.fn().mockReturnValue([])
    };

    const mockRuntimeWithNested = {
      ...mockRuntime,
      errors: [],
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
