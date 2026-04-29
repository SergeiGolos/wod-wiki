/**
 * Tests for useRuntimeTimer hook
 *
 * Verifies that the hook correctly re-exports runtime hooks and values,
 * and that the module boundary is respected (no direct runtime imports needed
 * by consumers).
 */

import { describe, it, expect } from 'bun:test';

describe('useRuntimeTimer', () => {
  it('should export useTimerElapsed', async () => {
    const { useTimerElapsed } = await import('../useRuntimeTimer');
    expect(typeof useTimerElapsed).toBe('function');
  });

  it('should export useRoundDisplay', async () => {
    const { useRoundDisplay } = await import('../useRuntimeTimer');
    expect(typeof useRoundDisplay).toBe('function');
  });

  it('should export useNextPreview', async () => {
    const { useNextPreview } = await import('../useRuntimeTimer');
    expect(typeof useNextPreview).toBe('function');
  });

  it('should export useRuntimeExecution', async () => {
    const { useRuntimeExecution } = await import('../useRuntimeTimer');
    expect(typeof useRuntimeExecution).toBe('function');
  });

  it('should export useOutputStatements', async () => {
    const { useOutputStatements } = await import('../useRuntimeTimer');
    expect(typeof useOutputStatements).toBe('function');
  });

  it('should export useWorkoutTracker', async () => {
    const { useWorkoutTracker } = await import('../useRuntimeTimer');
    expect(typeof useWorkoutTracker).toBe('function');
  });

  it('should export useScriptRuntime', async () => {
    const { useScriptRuntime } = await import('../useRuntimeTimer');
    expect(typeof useScriptRuntime).toBe('function');
  });

  it('should export ScriptRuntimeProvider', async () => {
    const { ScriptRuntimeProvider } = await import('../useRuntimeTimer');
    expect(typeof ScriptRuntimeProvider).toBe('function');
  });

  it('should export NextEvent class', async () => {
    const { NextEvent } = await import('../useRuntimeTimer');
    expect(typeof NextEvent).toBe('function');
  });

  it('should export SubscriptionManager class', async () => {
    const { SubscriptionManager } = await import('../useRuntimeTimer');
    expect(typeof SubscriptionManager).toBe('function');
  });

  it('should export VISIBILITY_LABELS with expected keys', async () => {
    const { VISIBILITY_LABELS } = await import('../useRuntimeTimer');
    expect(VISIBILITY_LABELS).toHaveProperty('display');
    expect(VISIBILITY_LABELS).toHaveProperty('result');
    expect(VISIBILITY_LABELS).toHaveProperty('promote');
    expect(VISIBILITY_LABELS).toHaveProperty('private');
  });

  it('should export RuntimeLogger singleton', async () => {
    const { RuntimeLogger } = await import('../useRuntimeTimer');
    expect(RuntimeLogger).toBeDefined();
    expect(typeof RuntimeLogger.enable).toBe('function');
    expect(typeof RuntimeLogger.disable).toBe('function');
  });

  it('should export ScriptRuntime class', async () => {
    const { ScriptRuntime } = await import('../useRuntimeTimer');
    expect(typeof ScriptRuntime).toBe('function');
  });
});
