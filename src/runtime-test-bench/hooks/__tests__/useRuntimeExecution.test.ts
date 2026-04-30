/**
 * Tests for useRuntimeExecution hook
 *
 * Specifically guards the [UX-02] regression: starting an already-running
 * execution must surface developer feedback instead of silently no-op'ing.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useRuntimeExecution } from '../useRuntimeExecution';
import type { ScriptRuntime } from '../../../runtime/ScriptRuntime';

function createMockRuntime(): ScriptRuntime {
  // Minimal stub — only the surface used by useRuntimeExecution is implemented:
  //  - `handle` (called for tick/resume/pause events)
  //  - `subscribeToStack` (used to detect completion)
  // Other ScriptRuntime methods are intentionally not stubbed; tests should
  // not exercise code paths that depend on them.
  return {
    handle: () => { },
    subscribeToStack: () => () => { },
  } as unknown as ScriptRuntime;
}

describe('useRuntimeExecution', () => {
  let originalWarn: typeof console.warn;
  let warnSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    originalWarn = console.warn;
    warnSpy = mock(() => { });
    console.warn = warnSpy as any;
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  it('starts execution and reports running status', () => {
    const runtime = createMockRuntime();
    const { result } = renderHook(() => useRuntimeExecution(runtime));

    expect(result.current.status).toBe('idle');

    act(() => {
      result.current.start();
    });

    expect(result.current.status).toBe('running');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('[UX-02] warns instead of silently failing when start() is called while running', () => {
    const runtime = createMockRuntime();
    const { result } = renderHook(() => useRuntimeExecution(runtime));

    act(() => {
      result.current.start();
    });
    expect(result.current.status).toBe('running');

    // Second start while already running should surface a warning,
    // not silently no-op (the original [UX-02] regression).
    act(() => {
      result.current.start();
    });

    expect(result.current.status).toBe('running');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = String((warnSpy.mock.calls[0] as unknown as unknown[])[0] ?? '');
    expect(message.toLowerCase()).toContain('already running');
  });

  it('warns when start() is called without a runtime', () => {
    const { result } = renderHook(() => useRuntimeExecution(null));

    act(() => {
      result.current.start();
    });

    expect(result.current.status).toBe('idle');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
