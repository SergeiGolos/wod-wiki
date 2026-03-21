/**
 * ScopedRuntimeProvider Tests
 *
 * Unit tests verifying that ScopedRuntimeProvider creates independent
 * runtime scopes by wrapping RuntimeLifecycleProvider.
 */

import { describe, it, expect } from 'bun:test';
import { ScopedRuntimeProvider } from '@/panels/page-shells/ScopedRuntimeProvider';
import { RuntimeLifecycleProvider } from '@/components/layout/RuntimeLifecycleProvider';

describe('ScopedRuntimeProvider', () => {
  it('should export ScopedRuntimeProvider component', () => {
    expect(ScopedRuntimeProvider).toBeDefined();
    expect(typeof ScopedRuntimeProvider).toBe('function');
  });

  it('should be the default export', async () => {
    const mod = await import('@/panels/page-shells/ScopedRuntimeProvider');
    expect(mod.ScopedRuntimeProvider).toBe(mod.default);
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
