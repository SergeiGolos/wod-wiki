/**
 * Tests for useRuntimeFactory hook
 *
 * Verifies that the hook correctly re-exports the compiler singleton and
 * RuntimeFactory, and provides a stable factory instance.
 */

import { describe, it, expect } from 'bun:test';
import { renderHook } from '@testing-library/react';

describe('useRuntimeFactory', () => {
  it('should export globalCompiler', async () => {
    const { globalCompiler } = await import('../useRuntimeFactory');
    expect(globalCompiler).toBeDefined();
  });

  it('should export RuntimeFactory class', async () => {
    const { RuntimeFactory } = await import('../useRuntimeFactory');
    expect(typeof RuntimeFactory).toBe('function');
  });

  it('should export runtimeFactory singleton', async () => {
    const { runtimeFactory } = await import('../useRuntimeFactory');
    expect(runtimeFactory).toBeDefined();
  });

  it('runtimeFactory should be an instance of RuntimeFactory', async () => {
    const { runtimeFactory, RuntimeFactory } = await import('../useRuntimeFactory');
    expect(runtimeFactory).toBeInstanceOf(RuntimeFactory);
  });

  it('should export useRuntimeFactory hook function', async () => {
    const { useRuntimeFactory } = await import('../useRuntimeFactory');
    expect(typeof useRuntimeFactory).toBe('function');
  });

  it('useRuntimeFactory hook should expose the shared factory', () => {
    const { useRuntimeFactory, runtimeFactory } = require('../useRuntimeFactory');
    const { result } = renderHook(() => useRuntimeFactory());
    expect(result.current.factory).toBe(runtimeFactory);
  });
});
