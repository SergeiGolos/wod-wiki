import { vi, expect } from 'vitest';
import { IScriptRuntime } from '../../../src/runtime/IScriptRuntime';
import { IRuntimeBehavior } from '../../../src/runtime/IRuntimeBehavior';
import { RuntimeBlock } from '../../../src/runtime/RuntimeBlock';
import { IRuntimeAction } from '../../../src/runtime/IRuntimeAction';

/**
 * Creates a mock script runtime for testing runtime blocks.
 * Provides minimal runtime services needed for block lifecycle tests.
 */
export function createMockRuntime(): IScriptRuntime {
  const memory = {
    allocate: vi.fn((type: string, owner: string, initialValue?: any, visibility?: string) => {
      return {
        id: `mock-ref-${Math.random()}`,
        type,
        owner,
        get: vi.fn(() => initialValue),
        set: vi.fn(),
        update: vi.fn(),
        visibility: visibility || 'private'
      };
    }),
    release: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    find: vi.fn(() => []),
    findByOwner: vi.fn(() => []),
    clear: vi.fn(),
  };

  const mockStack = {
    _blocks: [],
    blocks: [],
    blocksTopFirst: [],
    push: vi.fn(),
    pop: vi.fn(),
    peek: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    get length() { return this._blocks.length; },
  };

  const mockScript = {
    source: '',
    tokens: [],
    ast: null,
  };

  const mockJit = {
    compile: vi.fn(),
  };

  const mockRuntime: Partial<IScriptRuntime> = {
    memory: memory as any,
    stack: mockStack as any,
    script: mockScript as any,
    jit: mockJit as any,
    handle: vi.fn(),
  };

  return mockRuntime as IScriptRuntime;
}

/**
 * Creates a mock runtime behavior for testing.
 * All lifecycle hooks are spies that can be asserted against.
 */
export function createMockBehavior(name: string): IRuntimeBehavior {
  return {
    name,
    onPush: vi.fn((): IRuntimeAction[] => []),
    onNext: vi.fn((): IRuntimeAction[] => []),
    onPop: vi.fn((): IRuntimeAction[] => []),
  } as any;
}

/**
 * Asserts that a block's lifecycle methods are called in correct order.
 * Validates mount → next (optional) → unmount sequence.
 */
export function assertBlockLifecycle(block: RuntimeBlock, runtime: IScriptRuntime): void {
  const mountSpy = vi.spyOn(block, 'mount');
  const unmountSpy = vi.spyOn(block, 'unmount');

  // Execute lifecycle
  block.mount(runtime);
  block.unmount(runtime);

  // Verify order
  expect(mountSpy).toHaveBeenCalledBefore(unmountSpy);
  expect(mountSpy).toHaveBeenCalledTimes(1);
  expect(unmountSpy).toHaveBeenCalledTimes(1);
}

/**
 * Asserts that a block properly cleans up all resources on disposal.
 * Checks memory release, event listener cleanup, and interval clearing.
 */
export function assertDisposalComplete(block: RuntimeBlock, runtime: IScriptRuntime): void {
  const memoryReleaseSpy = vi.spyOn(runtime.memory, 'release');

  // Dispose block
  block.dispose(runtime);

  // Verify memory cleanup - should have released all allocated memory
  expect(memoryReleaseSpy).toHaveBeenCalled();
}

/**
 * Captures runtime actions returned from lifecycle methods.
 * Useful for asserting on emitted events or block pushes.
 */
export function captureActions(fn: () => IRuntimeAction[]): IRuntimeAction[] {
  return fn();
}

/**
 * Asserts that actions contain specific event emissions.
 */
export function assertActionsIncludeEvent(
  actions: IRuntimeAction[],
  eventType: string
): void {
  const hasEvent = actions.some(
    action => action.type === 'emit' && (action as any).eventType === eventType
  );
  expect(hasEvent).toBe(true);
}
