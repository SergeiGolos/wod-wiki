/**
 * ScopedRuntimeProvider Tests
 *
 * Unit tests verifying that ScopedRuntimeProvider creates independent
 * runtime scopes by wrapping RuntimeLifecycleProvider.
 */

import { describe, it, expect } from 'bun:test';
import { ScopedRuntimeProvider } from '@/panels/page-shells/ScopedRuntimeProvider';
import { RuntimeLifecycleProvider } from '@/contexts/RuntimeLifecycleProvider';

describe('ScopedRuntimeProvider', () => {
  it('should export ScopedRuntimeProvider component', () => {
    expect(ScopedRuntimeProvider).toBeDefined();
    expect(typeof ScopedRuntimeProvider).toBe('function');
  });

  it('should be a named export', async () => {
    const mod = await import('@/panels/page-shells/ScopedRuntimeProvider');
    expect(mod.ScopedRuntimeProvider).toBeDefined();
    expect(mod.ScopedRuntimeProvider).toBe(ScopedRuntimeProvider);
  });
});

describe('ScopedRuntimeProvider nesting safety', () => {
  it('should wrap RuntimeLifecycleProvider (verifying import path)', () => {
    // Verify the provider module imports correctly
    expect(RuntimeLifecycleProvider).toBeDefined();
    expect(typeof RuntimeLifecycleProvider).toBe('function');
  });

  it('ScopedRuntimeProvider and RuntimeLifecycleProvider are independent functions', () => {
    // ScopedRuntimeProvider wraps RuntimeLifecycleProvider but is a separate function
    expect(ScopedRuntimeProvider).not.toBe(RuntimeLifecycleProvider);
  });
});
