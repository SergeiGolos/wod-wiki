// @vitest-environment jsdom
/**
 * Tests for useWakeLock hook
 * 
 * Note: The Screen Wake Lock API is not available in jsdom/Node environments,
 * so we test the hook's behavior with mocked navigator.wakeLock
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

// Mock wake lock sentinel
const createMockWakeLockSentinel = () => {
  const eventListeners: Map<string, Set<() => void>> = new Map();
  
  return {
    released: false,
    type: 'screen' as const,
    release: vi.fn(async function(this: { released: boolean }) {
      this.released = true;
      // Trigger release event
      const listeners = eventListeners.get('release');
      if (listeners) {
        listeners.forEach(cb => cb());
      }
    }),
    addEventListener: vi.fn((event: string, callback: () => void) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add(callback);
    }),
    removeEventListener: vi.fn((event: string, callback: () => void) => {
      eventListeners.get(event)?.delete(callback);
    }),
    onrelease: null,
    // Helper to simulate release event
    _triggerRelease: () => {
      const listeners = eventListeners.get('release');
      if (listeners) {
        listeners.forEach(cb => cb());
      }
    }
  };
};

describe('useWakeLock', () => {
  let originalNavigator: Navigator;
  let mockWakeLock: {
    request: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Store original navigator
    originalNavigator = global.navigator;
    
    // Create mock wake lock
    mockWakeLock = {
      request: vi.fn()
    };

    // Mock navigator with wakeLock support
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        wakeLock: mockWakeLock
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
    vi.clearAllMocks();
  });

  describe('when Wake Lock API is supported', () => {
    it('should return isSupported: true', () => {
      const { result } = renderHook(() => useWakeLock());
      expect(result.current.isSupported).toBe(true);
    });

    it('should start with isActive: false', () => {
      const { result } = renderHook(() => useWakeLock());
      expect(result.current.isActive).toBe(false);
    });

    it('should acquire wake lock on request()', async () => {
      const mockSentinel = createMockWakeLockSentinel();
      mockWakeLock.request.mockResolvedValue(mockSentinel);

      const { result } = renderHook(() => useWakeLock());

      let success: boolean;
      await act(async () => {
        success = await result.current.request();
      });

      expect(success!).toBe(true);
      expect(result.current.isActive).toBe(true);
      expect(mockWakeLock.request).toHaveBeenCalledWith('screen');
    });

    it('should release wake lock on release()', async () => {
      const mockSentinel = createMockWakeLockSentinel();
      mockWakeLock.request.mockResolvedValue(mockSentinel);

      const { result } = renderHook(() => useWakeLock());

      await act(async () => {
        await result.current.request();
      });

      expect(result.current.isActive).toBe(true);

      await act(async () => {
        await result.current.release();
      });

      expect(result.current.isActive).toBe(false);
      expect(mockSentinel.release).toHaveBeenCalled();
    });

    it('should automatically request wake lock when enabled=true', async () => {
      const mockSentinel = createMockWakeLockSentinel();
      mockWakeLock.request.mockResolvedValue(mockSentinel);

      const { result } = renderHook(() => useWakeLock({ enabled: true }));

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      expect(mockWakeLock.request).toHaveBeenCalledWith('screen');
    });

    it('should release wake lock when enabled changes to false', async () => {
      const mockSentinel = createMockWakeLockSentinel();
      mockWakeLock.request.mockResolvedValue(mockSentinel);

      const { result, rerender } = renderHook(
        ({ enabled }) => useWakeLock({ enabled }),
        { initialProps: { enabled: true } }
      );

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      rerender({ enabled: false });

      await waitFor(() => {
        expect(result.current.isActive).toBe(false);
      });

      expect(mockSentinel.release).toHaveBeenCalled();
    });

    it('should handle wake lock request failure gracefully', async () => {
      mockWakeLock.request.mockRejectedValue(new Error('Permission denied'));

      const { result } = renderHook(() => useWakeLock());

      let success: boolean;
      await act(async () => {
        success = await result.current.request();
      });

      expect(success!).toBe(false);
      expect(result.current.isActive).toBe(false);
    });

    it('should not request multiple times if already active', async () => {
      const mockSentinel = createMockWakeLockSentinel();
      mockWakeLock.request.mockResolvedValue(mockSentinel);

      const { result } = renderHook(() => useWakeLock());

      await act(async () => {
        await result.current.request();
      });

      await act(async () => {
        await result.current.request();
      });

      expect(mockWakeLock.request).toHaveBeenCalledTimes(1);
    });

    it('should release wake lock on unmount', async () => {
      const mockSentinel = createMockWakeLockSentinel();
      mockWakeLock.request.mockResolvedValue(mockSentinel);

      const { result, unmount } = renderHook(() => useWakeLock({ enabled: true }));

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      unmount();

      expect(mockSentinel.release).toHaveBeenCalled();
    });
  });

  describe('when Wake Lock API is not supported', () => {
    beforeEach(() => {
      // Remove wakeLock from navigator
      Object.defineProperty(global, 'navigator', {
        value: {
          ...originalNavigator
          // No wakeLock property
        },
        writable: true,
        configurable: true
      });
    });

    it('should return isSupported: false', () => {
      const { result } = renderHook(() => useWakeLock());
      expect(result.current.isSupported).toBe(false);
    });

    it('should return false from request()', async () => {
      const { result } = renderHook(() => useWakeLock());

      let success: boolean;
      await act(async () => {
        success = await result.current.request();
      });

      expect(success!).toBe(false);
      expect(result.current.isActive).toBe(false);
    });

    it('should not throw on release() when not supported', async () => {
      const { result } = renderHook(() => useWakeLock());

      await act(async () => {
        await expect(result.current.release()).resolves.toBeUndefined();
      });
    });
  });
});
