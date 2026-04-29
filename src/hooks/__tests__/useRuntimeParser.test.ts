/**
 * Tests for useRuntimeParser hook
 *
 * Verifies that the hook correctly re-exports parser utilities and provides
 * a stable parse API without requiring direct parser/ imports.
 */

import { describe, it, expect } from 'bun:test';
import { renderHook } from '@testing-library/react';

describe('useRuntimeParser', () => {
  it('should export sharedParser singleton', async () => {
    const { sharedParser } = await import('../useRuntimeParser');
    expect(sharedParser).toBeDefined();
    expect(typeof sharedParser.read).toBe('function');
  });

  it('should export MdTimerRuntime class', async () => {
    const { MdTimerRuntime } = await import('../useRuntimeParser');
    expect(typeof MdTimerRuntime).toBe('function');
    const instance = new MdTimerRuntime();
    expect(instance).toBeDefined();
  });

  it('should export extractStatements function', async () => {
    const { extractStatements } = await import('../useRuntimeParser');
    expect(typeof extractStatements).toBe('function');
  });

  it('should export useRuntimeParser hook function', async () => {
    const { useRuntimeParser } = await import('../useRuntimeParser');
    expect(typeof useRuntimeParser).toBe('function');
  });

  it('useRuntimeParser hook should expose a parse helper', () => {
    const { useRuntimeParser } = require('../useRuntimeParser');
    const { result } = renderHook(() => useRuntimeParser());
    expect(typeof result.current.parse).toBe('function');
  });
});

