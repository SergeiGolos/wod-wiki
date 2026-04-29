/**
 * Tests for useWorkbenchServices hook
 *
 * Verifies that the hook correctly re-exports pure service utility functions
 * without requiring direct services/ imports. This module is safe to import
 * in unit tests because it contains no browser-only singleton dependencies.
 */

import { describe, it, expect } from 'bun:test';
import { renderHook } from '@testing-library/react';

describe('useWorkbenchServices', () => {
  it('should export getAnalyticsFromLogs function', async () => {
    const { getAnalyticsFromLogs } = await import('../useWorkbenchServices');
    expect(typeof getAnalyticsFromLogs).toBe('function');
  });

  it('should export getAnalyticsFromRuntime function', async () => {
    const { getAnalyticsFromRuntime } = await import('../useWorkbenchServices');
    expect(typeof getAnalyticsFromRuntime).toBe('function');
  });

  it('should export exportNote, exportAllNotes, importFromZip, pickFile', async () => {
    const { exportNote, exportAllNotes, importFromZip, pickFile } = await import('../useWorkbenchServices');
    expect(typeof exportNote).toBe('function');
    expect(typeof exportAllNotes).toBe('function');
    expect(typeof importFromZip).toBe('function');
    expect(typeof pickFile).toBe('function');
  });

  it('should export useWorkbenchServices hook function', async () => {
    const { useWorkbenchServices } = await import('../useWorkbenchServices');
    expect(typeof useWorkbenchServices).toBe('function');
  });

  it('useWorkbenchServices hook should expose a deriveAnalytics helper', () => {
    const { useWorkbenchServices } = require('../useWorkbenchServices');
    const { result } = renderHook(() => useWorkbenchServices());
    expect(typeof result.current.deriveAnalytics).toBe('function');
  });
});



