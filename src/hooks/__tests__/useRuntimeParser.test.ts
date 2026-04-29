/**
 * Tests for useRuntimeParser hook
 *
 * Verifies that the hook correctly re-exports parser utilities and provides
 * a stable parse/compile API without requiring direct parser/ imports.
 */

import { describe, it, expect } from 'bun:test';

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

  it('should export globalCompiler', async () => {
    const { globalCompiler } = await import('../useRuntimeParser');
    expect(globalCompiler).toBeDefined();
  });

  it('should export RuntimeFactory class', async () => {
    const { RuntimeFactory } = await import('../useRuntimeParser');
    expect(typeof RuntimeFactory).toBe('function');
  });

  it('should export runtimeFactory singleton', async () => {
    const { runtimeFactory } = await import('../useRuntimeParser');
    expect(runtimeFactory).toBeDefined();
  });

  it('should export extractStatements function', async () => {
    const { extractStatements } = await import('../useRuntimeParser');
    expect(typeof extractStatements).toBe('function');
  });

  it('should export useRuntimeParser hook function', async () => {
    const { useRuntimeParser } = await import('../useRuntimeParser');
    expect(typeof useRuntimeParser).toBe('function');
  });

  it('runtimeFactory should be an instance of RuntimeFactory', async () => {
    const { runtimeFactory, RuntimeFactory } = await import('../useRuntimeParser');
    expect(runtimeFactory).toBeInstanceOf(RuntimeFactory);
  });
});
