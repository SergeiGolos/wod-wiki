/**
 * Tests for useRuntimeDebug hook
 *
 * Verifies that the hook correctly re-exports debug utilities and
 * provides reactive logging controls.
 */

import { describe, it, expect } from 'bun:test';
import { renderHook, act } from '@testing-library/react';

describe('useRuntimeDebug', () => {
  it('should export RuntimeLogger singleton', async () => {
    const { RuntimeLogger } = await import('../useRuntimeDebug');
    expect(RuntimeLogger).toBeDefined();
    expect(typeof RuntimeLogger.enable).toBe('function');
    expect(typeof RuntimeLogger.disable).toBe('function');
    expect(RuntimeLogger).toHaveProperty('enabled');
  });

  it('should export RuntimeAdapter class', async () => {
    const { RuntimeAdapter } = await import('../useRuntimeDebug');
    expect(typeof RuntimeAdapter).toBe('function');
  });

  it('should export useRuntimeDebug hook function', async () => {
    const { useRuntimeDebug } = await import('../useRuntimeDebug');
    expect(typeof useRuntimeDebug).toBe('function');
  });

  it('useRuntimeDebug should expose enable and disable controls', async () => {
    const { useRuntimeDebug } = await import('../useRuntimeDebug');
    const { result } = renderHook(() => useRuntimeDebug());

    expect(typeof result.current.enableLogging).toBe('function');
    expect(typeof result.current.disableLogging).toBe('function');
    expect(typeof result.current.isLoggingEnabled).toBe('boolean');
  });

  it('useRuntimeDebug enable/disable should toggle isLoggingEnabled', async () => {
    const { useRuntimeDebug } = await import('../useRuntimeDebug');
    const { result } = renderHook(() => useRuntimeDebug());

    act(() => {
      result.current.enableLogging();
    });
    expect(result.current.isLoggingEnabled).toBe(true);

    act(() => {
      result.current.disableLogging();
    });
    expect(result.current.isLoggingEnabled).toBe(false);
  });
});
