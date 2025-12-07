import { vi } from 'vitest';

// Provide vi.mocked helper for compatibility across tests
if (!(vi as any).mocked) {
  Object.defineProperty(vi as any, 'mocked', {
    value: <T>(fn: T): T => fn,
    writable: false,
    configurable: true,
  });
}
