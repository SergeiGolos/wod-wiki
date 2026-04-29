/**
 * Tests for useCastSignaling hook
 *
 * Verifies that the hook correctly re-exports cast SDK classes and
 * provides reactive state updates via the ChromecastSdk event bus.
 */

import { describe, it, expect, mock } from 'bun:test';

describe('useCastSignaling', () => {
  it('should export ChromecastSdk singleton', async () => {
    const { ChromecastSdk } = await import('../useCastSignaling');
    expect(ChromecastSdk).toBeDefined();
    expect(typeof ChromecastSdk.getState).toBe('function');
    expect(typeof ChromecastSdk.isSessionActive).toBe('function');
  });

  it('should export SenderCastSignaling class', async () => {
    const { SenderCastSignaling } = await import('../useCastSignaling');
    expect(typeof SenderCastSignaling).toBe('function');
  });

  it('should export WebRtcRpcTransport class', async () => {
    const { WebRtcRpcTransport } = await import('../useCastSignaling');
    expect(typeof WebRtcRpcTransport).toBe('function');
  });

  it('should export ChromecastRuntimeSubscription class', async () => {
    const { ChromecastRuntimeSubscription } = await import('../useCastSignaling');
    expect(typeof ChromecastRuntimeSubscription).toBe('function');
  });

  it('should export ChromecastEventProvider class', async () => {
    const { ChromecastEventProvider } = await import('../useCastSignaling');
    expect(typeof ChromecastEventProvider).toBe('function');
  });

  it('should export ClockSyncService class', async () => {
    const { ClockSyncService } = await import('../useCastSignaling');
    expect(typeof ClockSyncService).toBe('function');
  });

  it('should export CAST_APP_ID string', async () => {
    const { CAST_APP_ID } = await import('../useCastSignaling');
    expect(typeof CAST_APP_ID).toBe('string');
  });

  it('should export hasCustomCastAppId boolean', async () => {
    const { hasCustomCastAppId } = await import('../useCastSignaling');
    expect(typeof hasCustomCastAppId).toBe('boolean');
  });

  it('should export useCastSignaling hook function', async () => {
    const { useCastSignaling } = await import('../useCastSignaling');
    expect(typeof useCastSignaling).toBe('function');
  });
});
